import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import api from '../../services/api';
import { formatDateVN } from '../../utils/dateUtils';
import CCCDUploader from '../upload/CCCDUploader';

export default function StudentProfileEditor({ studentData, isOpen, onClose, onUpdateSuccess }) {
    const { register, handleSubmit, reset, setValue } = useForm();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [imageFront, setImageFront] = useState(studentData?.image_cccd_front || '');
    const [imageBack, setImageBack] = useState(studentData?.image_cccd_back || '');
    const [imagePortrait, setImagePortrait] = useState(studentData?.image_3x4 || '');

    useEffect(() => {
        if (studentData) {
            // Update image URLs for preview
            setImageFront(studentData.image_cccd_front || '');
            setImageBack(studentData.image_cccd_back || '');
            setImagePortrait(studentData.image_3x4 || '');

            // Map database fields to form fields
            const formData = {
                // Name fields
                ho: studentData.ho || '',
                ten_dem: studentData.ten_dem || '',
                ten: studentData.ten || '',
                // Personal info
                ngay_sinh: formatDateVN(studentData.ngay_sinh) || '',
                // Map gender values: 'male'/'female' -> 'Nam'/'Nữ', or keep as is if already 'Nam'/'Nữ'
                gioi_tinh: studentData.gioi_tinh === 'male' || studentData.gioi_tinh === 'Male' ? 'Nam' :
                    studentData.gioi_tinh === 'female' || studentData.gioi_tinh === 'Female' ? 'Nữ' :
                        studentData.gioi_tinh === 'Nữ' || studentData.gioi_tinh === 'nữ' ? 'Nữ' :
                            studentData.gioi_tinh === 'Nam' || studentData.gioi_tinh === 'nam' ? 'Nam' :
                                studentData.gioi_tinh || 'Nam',
                noi_sinh: studentData.noi_sinh || '',
                dan_toc: studentData.dan_toc || '',
                quoc_tich: studentData.quoc_tich || '',
                // Contact
                sdt: studentData.sdt || '',
                email: studentData.email || '',
                // Address 
                dia_chi: studentData.dia_chi || '',
                // ID
                cccd: studentData.cccd || '',
                // New Fields
                ngay_cap_cccd: formatDateVN(studentData.ngay_cap_cccd) || '',
                don_vi_cong_tac: studentData.don_vi_cong_tac || '',
                // Image IDs for Cloudflare Images
                cccd_front_image_id: studentData.cccd_front_image_id || '',
                cccd_back_image_id: studentData.cccd_back_image_id || '',
                photo_3x4_image_id: studentData.photo_3x4_image_id || '',
            };
            reset(formData);
        }
    }, [studentData, reset]);

    // Handle image upload success from CCCDUploader
    const handleImageUploadSuccess = (field) => (result) => {
        console.log('Image upload success:', { field, result });

        // Map field to form field name for image ID
        const imageIdField = field === 'front' ? 'cccd_front_image_id' :
            field === 'back' ? 'cccd_back_image_id' : 'photo_3x4_image_id';

        // Set image ID for Cloudflare Images (backend will generate URL)
        if (result && result.imageId) {
            console.log('Setting image ID:', imageIdField, result.imageId);
            setValue(imageIdField, result.imageId);

            // Auto-save immediately after upload
            const saveToDatabase = async () => {
                try {
                    console.log('Starting auto-save to database...');
                    setLoading(true);
                    setError('');

                    // Update only the image field
                    const updateData = {
                        [imageIdField]: result.imageId
                    };

                    console.log('Update data:', updateData);
                    console.log('Student data:', { id: studentData?.id, cccd: studentData?.cccd });

                    // Student tự cập nhật luôn dùng update-by-cccd
                    const response = await api.updateStudentByCCCD(studentData?.cccd, { ...updateData, cccd: studentData?.cccd });

                    console.log('Update response:', response);

                    if (response && (response.success || response.data)) {
                        console.log('Auto-save successful!');
                        console.log('Response data:', response.data);

                        // Update local state to reflect new image URL from response
                        // Backend now returns full student data with image URLs
                        const studentData = response.data || {};
                        const imageUrl = studentData[field === 'front' ? 'image_cccd_front' :
                            field === 'back' ? 'image_cccd_back' : 'image_3x4'];

                        console.log('Image URL from response:', imageUrl);

                        if (field === 'front' && imageUrl) {
                            console.log('Updating front image:', imageUrl);
                            setImageFront(imageUrl);
                        } else if (field === 'back' && imageUrl) {
                            console.log('Updating back image:', imageUrl);
                            setImageBack(imageUrl);
                        } else if (field === 'portrait' && imageUrl) {
                            console.log('Updating portrait image:', imageUrl);
                            setImagePortrait(imageUrl);
                        } else {
                            console.warn('No image URL in response for field:', field);
                        }

                        // Show success message briefly
                        const originalError = error;
                        setError('');
                        setTimeout(() => {
                            if (!error) setError(originalError);
                        }, 2000);
                    } else {
                        const errorMsg = response?.message || 'Lưu ảnh thất bại';
                        console.error('Auto-save failed:', errorMsg);
                        setError(errorMsg);
                    }
                } catch (err) {
                    console.error('Auto-save error:', err);
                    setError(err.message || 'Lỗi khi tự động lưu ảnh');
                } finally {
                    setLoading(false);
                }
            };

            // Execute immediately
            saveToDatabase();
        } else {
            console.warn('No imageId in result:', result);
        }

        // Note: Preview is handled by CCCDUploader component itself
        // Backend will generate signed URLs when fetching student data
    };

    const handleImageUploadError = (err) => {
        setError(err.message || 'Lỗi upload ảnh');
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setError('');
        try {
            console.log('Form submit data:', data);

            // Student tự cập nhật luôn dùng update-by-cccd (route /:id yêu cầu admin)
            const response = await api.updateStudentByCCCD(studentData.cccd, { ...data, cccd: studentData.cccd });

            console.log('Form submit response:', response);

            if (response.success || response.data) {
                // Update local image states from response if available
                if (response.data) {
                    if (response.data.image_cccd_front) {
                        setImageFront(response.data.image_cccd_front);
                    }
                    if (response.data.image_cccd_back) {
                        setImageBack(response.data.image_cccd_back);
                    }
                    if (response.data.image_3x4) {
                        setImagePortrait(response.data.image_3x4);
                    }

                    // Cập nhật student_data trong localStorage để sidebar hiện ảnh 3x4 ngay
                    try {
                        const existing = JSON.parse(localStorage.getItem('student_data') || '{}');
                        const updated = { ...existing, ...response.data };
                        localStorage.setItem('student_data', JSON.stringify(updated));
                    } catch (_) { /* ignore */ }
                }

                // Gọi onUpdateSuccess để sidebar refresh localData từ localStorage
                if (typeof onUpdateSuccess === 'function') onUpdateSuccess();
                onClose();
            } else {
                setError(response.message || 'Cập nhật thất bại');
            }
        } catch (err) {
            console.error('Form submit error:', err);
            setError(err.message || 'Lỗi server');
        } finally {
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-none sm:rounded-2xl w-full max-w-7xl h-full sm:h-auto sm:max-h-[85vh] shadow-2xl flex flex-col transition-all duration-300">
                <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-green-50 rounded-t-none sm:rounded-t-2xl flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-green-800">Chỉnh sửa hồ sơ sinh viên</h2>
                        <p className="text-xs text-green-600">Cập nhật toàn bộ thông tin trong cơ sở dữ liệu</p>
                    </div>
                    <Button variant="ghost" onClick={onClose} size="icon" className="h-8 w-8 hover:bg-green-100/50">
                        <X size={20} />
                    </Button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-6 flex-1 overflow-y-auto min-h-0">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Information (8 cols) */}
                        <div className="lg:col-span-8 space-y-5">
                            {/* Personal Info Section */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                                    Thông tin cá nhân
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Họ</Label>
                                        <Input {...register('ho')} className="h-9 focus:border-green-500" />
                                    </div>
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Tên đệm</Label>
                                        <Input {...register('ten_dem')} className="h-9 focus:border-green-500" />
                                    </div>
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Tên</Label>
                                        <Input {...register('ten')} className="h-9 focus:border-green-500 bg-green-50/50 font-medium" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Ngày sinh</Label>
                                        <Input type="text" placeholder="DD/MM/YYYY" {...register('ngay_sinh')} className="h-9" />
                                    </div>
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Giới tính</Label>
                                        <select {...register('gioi_tinh')} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Nơi sinh</Label>
                                        <Input {...register('noi_sinh')} className="h-9" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Dân tộc</Label>
                                        <Input {...register('dan_toc')} className="h-9" />
                                    </div>
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Quốc tịch</Label>
                                        <Input {...register('quoc_tich')} className="h-9" />
                                    </div>
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Đơn vị công tác</Label>
                                        <Input {...register('don_vi_cong_tac')} placeholder="Trường học, cơ quan..." className="h-9" />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Section */}
                            <div className="space-y-3 pt-1">
                                <h3 className="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                    Liên hệ & Cư trú
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <Label className="text-xs">Số điện thoại</Label>
                                        <Input {...register('sdt')} className="h-9 focus:border-blue-500" />
                                    </div>
                                    <div className="sm:col-span-8 space-y-1.5">
                                        <Label className="text-xs">Email</Label>
                                        <Input {...register('email')} type="email" className="h-9 focus:border-blue-500" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Địa chỉ hiện tại</Label>
                                    <Input {...register('dia_chi')} placeholder="Số nhà, đường, phường, quận, tỉnh..." className="h-9 focus:border-blue-500" />
                                </div>
                            </div>

                            {/* ID Section */}
                            <div className="space-y-3 pt-1">
                                <h3 className="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <span className="w-1.5 h-6 bg-slate-500 rounded-full"></span>
                                    Giấy tờ tùy thân
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6 space-y-1.5">
                                        <Label className="text-xs">Số CCCD/CMND</Label>
                                        <Input {...register('cccd')} className="h-9 bg-slate-50 font-mono" readOnly />
                                    </div>
                                    <div className="sm:col-span-6 space-y-1.5">
                                        <Label className="text-xs">Ngày cấp CCCD</Label>
                                        <Input type="text" placeholder="DD/MM/YYYY" {...register('ngay_cap_cccd')} className="h-9" />
                                    </div>
                                </div>

                                {/* Hidden fields for image IDs to ensure they're sent on form submit */}
                                <input type="hidden" {...register('cccd_front_image_id')} />
                                <input type="hidden" {...register('cccd_back_image_id')} />
                                <input type="hidden" {...register('photo_3x4_image_id')} />
                            </div>
                        </div>

                        {/* Right Column: Images (4 cols) - Sticky */}
                        <div className="lg:col-span-4 space-y-4">
                            <h3 className="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                Ảnh hồ sơ
                            </h3>

                            <div className="space-y-4 sticky top-20">
                                {/* Ảnh 3x4 */}
                                <div className="space-y-1.5">
                                    <Label className="text-center block w-full text-indigo-700 text-xs">Ảnh thẻ 3x4</Label>
                                    <CCCDUploader
                                        type="photo_3x4"
                                        onUploadSuccess={handleImageUploadSuccess('portrait')}
                                        onUploadError={handleImageUploadError}
                                        existingImageUrl={imagePortrait}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* CCCD Mặt trước */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-center block w-full text-slate-500 uppercase">CCCD Mặt trước</Label>
                                        <CCCDUploader
                                            type="cccd_front"
                                            onUploadSuccess={handleImageUploadSuccess('front')}
                                            onUploadError={handleImageUploadError}
                                            existingImageUrl={imageFront}
                                        />
                                    </div>

                                    {/* CCCD Mặt sau */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-center block w-full text-slate-500 uppercase">CCCD Mặt sau</Label>
                                        <CCCDUploader
                                            type="cccd_back"
                                            onUploadSuccess={handleImageUploadSuccess('back')}
                                            onUploadError={handleImageUploadError}
                                            existingImageUrl={imageBack}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 rounded-b-none sm:rounded-b-2xl flex-shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto order-2 sm:order-1 h-10">Hủy bỏ</Button>
                    <Button onClick={handleSubmit(onSubmit)} className="bg-green-600 hover:bg-green-700 w-full sm:w-40 order-1 sm:order-2 shadow-lg shadow-green-100 h-10" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Lưu thay đổi
                    </Button>
                </div>
            </div>
        </div>
    );
}
