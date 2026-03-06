import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/ToastContainer';

export default function ClassSchedules({ classId, className, maLop }) {
    const { toast } = useToast();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        day_of_week: 1,
        start_time: '08:00',
        end_time: '10:00',
        room: '',
        notes: '',
        create_meet_link: false,
    });

    useEffect(() => {
        loadSchedules();
    }, [classId]);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const response = await api.getClassSchedules(classId);
            setSchedules(response.success && Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error loading schedules:', error);
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingSchedule(null);
        setFormData({
            day_of_week: 1,
            start_time: '08:00',
            end_time: '10:00',
            room: '',
            notes: '',
            create_meet_link: false,
        });
        setShowModal(true);
    };

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            room: schedule.room || '',
            notes: schedule.notes || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa lịch học này?')) return;
        try {
            await api.deleteClassSchedule(id);
            toast?.success('Đã xóa lịch học');
            loadSchedules();
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                class_id: classId,
                class_name: className,
                ma_lop: maLop,
                ...formData
            };
            if (editingSchedule) {
                await api.updateClassSchedule(editingSchedule.id, formData);
                toast?.success('Cập nhật thành công');
            } else {
                const result = await api.createClassSchedule(data);
                if (result.data?.meeting_link) {
                    toast?.success('Tạo lịch học thành công với Google Meet link!');
                } else {
                    toast?.success('Tạo lịch mới thành công');
                }
            }
            setShowModal(false);
            loadSchedules();
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const getDayName = (day) => ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][day];

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải lịch học...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Lịch học chi tiết</h3>
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                    <Plus size={16} className="mr-2" /> Thêm buổi học
                </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-4 py-3">Thứ</th>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Phòng</th>
                            <th className="px-4 py-3">Ghi chú</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {schedules.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có lịch học chi tiết.</td>
                            </tr>
                        ) : schedules.map((sch) => {
                            const isUrl = sch.room && (sch.room.startsWith('http://') || sch.room.startsWith('https://'));
                            return (
                                <tr key={sch.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-800">{getDayName(sch.day_of_week)}</td>
                                    <td className="px-4 py-3 font-mono text-slate-600">{sch.start_time} - {sch.end_time}</td>
                                    <td className="px-4 py-3">
                                        {isUrl ? (
                                            <a href={sch.room} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-200">
                                                🎥 Link học online
                                            </a>
                                        ) : (
                                            <span>{sch.room || <span className="text-red-500">⚠️ Chưa có</span>}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 italic">{sch.notes || '-'}</td>
                                    <td className="px-4 py-3 text-right space-x-1">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(sch)}>
                                            <Edit size={16} className="text-slate-400 hover:text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(sch.id)}>
                                            <Trash2 size={16} className="text-slate-400 hover:text-red-600" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSchedule ? 'Sửa lịch học' : 'Thêm buổi học'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Thứ trong tuần</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                value={formData.day_of_week}
                                onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6, 0].map(d => <option key={d} value={d}>{getDayName(d)}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Bắt đầu (24H)</Label>
                                <Input type="text" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} placeholder="08:00" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Kết thúc (24H)</Label>
                                <Input type="text" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} placeholder="10:00" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <span>Phòng học / Link học online</span>
                                <span className="text-xs text-blue-500 font-normal">(Nhập link Zoom/Meet nếu học online)</span>
                            </Label>
                            <Input
                                value={formData.room}
                                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                placeholder="P.101 hoặc https://meet.google.com/xxx-xxxx-xxx"
                                disabled={formData.create_meet_link}
                            />
                            {formData.room && (formData.room.startsWith('http://') || formData.room.startsWith('https://')) && (
                                <p className="text-xs text-green-600">✅ Đã nhận diện là link học online - Học viên sẽ thấy nút "Vào lớp học"</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Ghi chú</Label>
                            <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Lý thuyết/Thực hành..." />
                        </div>

                        {/* Checkbox tạo Google Meet tự động */}
                        {!editingSchedule && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.create_meet_link}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            create_meet_link: e.target.checked,
                                            room: e.target.checked ? '' : formData.room
                                        })}
                                        className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="font-semibold text-blue-800">🎥 Tự động tạo Google Meet</span>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Hệ thống sẽ tự động tạo link Google Meet cho buổi học này.
                                            Link sẽ được lưu lại và dùng lâu dài.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                            <Button type="submit" className="bg-blue-600 text-white">Lưu</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
