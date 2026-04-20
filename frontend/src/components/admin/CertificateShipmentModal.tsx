import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, Loader2, MapPin, Package, Phone, RefreshCw, ShieldCheck, Truck, XCircle } from 'lucide-react';
import api from '../../services/api';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';

const STATUS_META = {
  draft: { label: 'Nháp', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  quoted: { label: 'Đã báo giá', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  created: { label: 'Đã tạo vận đơn', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_transit: { label: 'Đang vận chuyển', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  delivered: { label: 'Đã giao', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled_local: { label: 'Đã hủy nội bộ', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  failed: { label: 'Thất bại', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const RESOLUTION_META = {
  resolved: { label: 'Đã chuẩn hóa', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  needs_review: { label: 'Cần kiểm tra', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  unresolved: { label: 'Chưa xác định', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function StatusBadge({ status, type = 'status' }) {
  const source = type === 'resolution' ? RESOLUTION_META : STATUS_META;
  const meta = source[status] || { label: status || 'Không rõ', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-slate-800 break-words">{value || 'Chưa có'}</div>
    </div>
  );
}

export default function CertificateShipmentModal({ open, onOpenChange, certificate, toast, onSuccess }) {
  const [currentShipment, setCurrentShipment] = useState(null);
  const [form, setForm] = useState({
    receiver_name: '',
    receiver_phone: '',
    raw_address: '',
    product_weight_grams: 250,
  });
  const [normalized, setNormalized] = useState(null);
  const [quote, setQuote] = useState(null);
  const [selectedServiceCode, setSelectedServiceCode] = useState('');
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [selectedAddCodes, setSelectedAddCodes] = useState([]);
  const [loadingShipment, setLoadingShipment] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState(false);

  const canShowExistingOnly = currentShipment && currentShipment.status && currentShipment.status !== 'draft';

  useEffect(() => {
    if (!open) return;

    setForm({
      receiver_name: certificate?.ho_ten_full || '',
      receiver_phone: certificate?.sdt || '',
      raw_address: certificate?.dia_chi || '',
      product_weight_grams: 250,
    });
    setNormalized(null);
    setQuote(null);
    setSelectedServiceCode('');
    setSelectedServiceName('');
    setSelectedAddCodes([]);
    setCurrentShipment(null);

    if (!certificate?.id) {
      return;
    }

    let ignore = false;
    const loadShipment = async () => {
      setLoadingShipment(true);
      try {
        const response = await api.getCertificateShipment(certificate.id);
        const shipment = response?.data || null;
        if (ignore) return;

        setCurrentShipment(shipment);
        if (shipment) {
          setForm({
            receiver_name: shipment.receiver_name || certificate?.ho_ten_full || '',
            receiver_phone: shipment.receiver_phone || certificate?.sdt || '',
            raw_address: shipment.address_raw || certificate?.dia_chi || '',
            product_weight_grams: shipment.product_weight_grams || 250,
          });

          if (shipment.address_line || shipment.normalized_full_address) {
            setNormalized({
              address_line: shipment.address_line || '',
              province_id: shipment.province_id,
              province_name: shipment.province_name,
              district_id: shipment.district_id,
              district_name: shipment.district_name,
              ward_id: shipment.ward_id,
              ward_name: shipment.ward_name,
              normalized_full_address: shipment.normalized_full_address || '',
              resolution_status: shipment.resolution_status || 'unresolved',
              warnings: Array.isArray(shipment.warnings) ? shipment.warnings : [],
            });
          }

          setSelectedServiceCode(shipment.service_code || '');
          setSelectedServiceName(shipment.service_name || '');
          setSelectedAddCodes(Array.isArray(shipment.service_add_codes) ? shipment.service_add_codes : []);
        }
      } catch (error) {
        if (!ignore) {
          setCurrentShipment(null);
        }
      } finally {
        if (!ignore) {
          setLoadingShipment(false);
        }
      }
    };

    loadShipment();
    return () => {
      ignore = true;
    };
  }, [open, certificate]);

  const availableServices = quote?.available_services || [];

  const selectedService = useMemo(
    () => availableServices.find((service) => service.service_code === selectedServiceCode) || null,
    [availableServices, selectedServiceCode],
  );

  useEffect(() => {
    if (!selectedService) return;
    setSelectedServiceName(selectedService.service_name || '');
    setSelectedAddCodes((prev) => prev.filter((code) => selectedService.supported_add_codes?.includes(code)));
  }, [selectedService]);

  const handleNormalize = async () => {
    if (!form.receiver_name || !form.receiver_phone || !form.raw_address) {
      toast?.error('Cần đủ họ tên, số điện thoại và địa chỉ trước khi chuẩn hóa.');
      return;
    }

    setNormalizing(true);
    setQuote(null);
    setSelectedServiceCode('');
    setSelectedServiceName('');
    setSelectedAddCodes([]);
    try {
      const response = await api.normalizeCertificateShipmentAddress({
        certificate_id: certificate?.id,
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        raw_address: form.raw_address,
      });
      setNormalized(response?.data || null);
    } catch (error) {
      toast?.error(error.message || 'Không chuẩn hóa được địa chỉ.');
    } finally {
      setNormalizing(false);
    }
  };

  const handleQuote = async () => {
    if (!normalized || normalized.resolution_status !== 'resolved') {
      toast?.error('Địa chỉ chưa ở trạng thái resolved nên chưa thể báo giá.');
      return;
    }

    setQuoting(true);
    try {
      const response = await api.quoteCertificateShipment({
        certificate_id: certificate?.id,
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        address_line: normalized.address_line,
        province_id: normalized.province_id,
        district_id: normalized.district_id,
        ward_id: normalized.ward_id,
        product_weight_grams: form.product_weight_grams,
      });
      const nextQuote = response?.data || null;
      setQuote(nextQuote);
      setSelectedServiceCode(nextQuote?.recommended_service_code || nextQuote?.available_services?.[0]?.service_code || '');
      setSelectedAddCodes(nextQuote?.recommended_service_add_codes || []);
    } catch (error) {
      toast?.error(error.message || 'Không báo giá được với Viettel Post.');
    } finally {
      setQuoting(false);
    }
  };

  const toggleAddCode = (code) => {
    setSelectedAddCodes((prev) => (
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code]
    ));
  };

  const handleCreateShipment = async () => {
    if (!normalized || normalized.resolution_status !== 'resolved') {
      toast?.error('Địa chỉ chưa được chuẩn hóa rõ ràng.');
      return;
    }
    if (!selectedServiceCode) {
      toast?.error('Cần chọn dịch vụ vận chuyển.');
      return;
    }

    setCreating(true);
    try {
      const response = await api.createCertificateShipment(certificate.id, {
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        raw_address: form.raw_address,
        address_line: normalized.address_line,
        province_id: normalized.province_id,
        province_name: normalized.province_name,
        district_id: normalized.district_id,
        district_name: normalized.district_name,
        ward_id: normalized.ward_id,
        ward_name: normalized.ward_name,
        normalized_full_address: normalized.normalized_full_address,
        resolution_status: normalized.resolution_status,
        warnings: normalized.warnings || [],
        service_code: selectedServiceCode,
        service_name: selectedServiceName,
        service_add_codes: selectedAddCodes,
        product_weight_grams: form.product_weight_grams,
      });
      const shipment = response?.data || null;
      setCurrentShipment(shipment);
      toast?.success('Đã tạo vận đơn Viettel Post.');
      onSuccess?.(shipment);
    } catch (error) {
      toast?.error(error.message || 'Tạo vận đơn thất bại.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyTracking = async () => {
    const tracking = currentShipment?.carrier_tracking_number || currentShipment?.carrier_order_number;
    if (!tracking) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(String(tracking));
      toast?.success('Đã copy mã vận đơn.');
    } catch (error) {
      toast?.error('Không copy được mã vận đơn.');
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden rounded-[28px] border-none p-0">
        <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,#052e16,#166534_55%,#16a34a)] px-6 py-5 text-white">
          <DialogTitle className="text-2xl font-black tracking-tight text-white">
            Vận đơn chứng chỉ
          </DialogTitle>
          <DialogDescription className="text-emerald-50">
            {certificate?.certificate_number || 'Chứng chỉ'} • {certificate?.ho_ten_full || 'Học viên'}
          </DialogDescription>
          <DialogClose className="text-white" />
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto bg-slate-100/70 p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Người nhận</div>
                    <div className="text-lg font-bold text-slate-900">{certificate?.ho_ten_full}</div>
                  </div>
                  {loadingShipment ? <Loader2 size={18} className="animate-spin text-slate-400" /> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow icon={<Phone size={12} />} label="Số điện thoại" value={form.receiver_phone} />
                  <InfoRow icon={<Package size={12} />} label="Số chứng chỉ" value={certificate?.certificate_number} />
                </div>
                <div className="mt-3">
                  <InfoRow icon={<MapPin size={12} />} label="Địa chỉ gốc" value={form.raw_address} />
                </div>
              </div>

              {currentShipment ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900">Vận đơn hiện tại</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={currentShipment.status} />
                      <StatusBadge status={currentShipment.resolution_status} type="resolution" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow icon={<Truck size={12} />} label="Mã vận đơn" value={currentShipment.carrier_tracking_number || currentShipment.carrier_order_number} />
                    <InfoRow icon={<ShieldCheck size={12} />} label="Dịch vụ" value={currentShipment.service_name || currentShipment.service_code} />
                    <InfoRow icon={<MapPin size={12} />} label="Địa chỉ chuẩn" value={currentShipment.normalized_full_address} />
                    <InfoRow icon={<Package size={12} />} label="Phí dự kiến" value={currentShipment.shipping_fee ? formatCurrency(currentShipment.shipping_fee) : 'Chưa có'} />
                  </div>

                  {Array.isArray(currentShipment.warnings) && currentShipment.warnings.length ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                      {currentShipment.warnings.map((warning) => (
                        <div key={warning}>{warning}</div>
                      ))}
                    </div>
                  ) : null}

                  {currentShipment.raw_response?.message ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
                      Phản hồi gần nhất từ carrier: {currentShipment.raw_response.message}
                    </div>
                  ) : null}

                  {currentShipment.carrier_tracking_number || currentShipment.carrier_order_number ? (
                    <button
                      onClick={handleCopyTracking}
                      disabled={copying}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {copying ? <Loader2 size={15} className="animate-spin" /> : <Clipboard size={15} />}
                      Copy mã vận đơn
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              {!canShowExistingOnly ? (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 text-sm font-bold text-slate-900">1. Chuẩn hóa địa chỉ</div>
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-700">
                        Họ tên người nhận
                        <input
                          value={form.receiver_name}
                          onChange={(event) => setForm((prev) => ({ ...prev, receiver_name: event.target.value }))}
                          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Số điện thoại
                        <input
                          value={form.receiver_phone}
                          onChange={(event) => setForm((prev) => ({ ...prev, receiver_phone: event.target.value }))}
                          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Địa chỉ thô của học viên
                        <textarea
                          rows={4}
                          value={form.raw_address}
                          onChange={(event) => setForm((prev) => ({ ...prev, raw_address: event.target.value }))}
                          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Khối lượng dự kiến (gram)
                        <input
                          type="number"
                          min="50"
                          step="10"
                          value={form.product_weight_grams}
                          onChange={(event) => setForm((prev) => ({ ...prev, product_weight_grams: Number(event.target.value) || 250 }))}
                          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        />
                      </label>
                    </div>

                    <button
                      onClick={handleNormalize}
                      disabled={normalizing}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {normalizing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      Chuẩn hóa địa chỉ
                    </button>
                  </div>

                  {normalized ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900">2. Kết quả chuẩn hóa</div>
                        <StatusBadge status={normalized.resolution_status} type="resolution" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoRow icon={<MapPin size={12} />} label="Address line" value={normalized.address_line} />
                        <InfoRow icon={<MapPin size={12} />} label="Địa chỉ chuẩn" value={normalized.normalized_full_address} />
                        <InfoRow icon={<MapPin size={12} />} label="Tỉnh/Thành" value={normalized.province_name} />
                        <InfoRow icon={<MapPin size={12} />} label="Quận/Huyện" value={normalized.district_name || 'Mô hình 2 cấp'} />
                        <InfoRow icon={<MapPin size={12} />} label="Xã/Phường" value={normalized.ward_name} />
                        <InfoRow icon={<Package size={12} />} label="Mã Viettel Post" value={`Tỉnh ${normalized.province_id || '-'} • Huyện ${normalized.district_id || '-'} • Xã ${normalized.ward_id || '-'}`} />
                      </div>

                      {Array.isArray(normalized.warnings) && normalized.warnings.length ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                          {normalized.warnings.map((warning) => (
                            <div key={warning}>{warning}</div>
                          ))}
                        </div>
                      ) : null}

                      <button
                        onClick={handleQuote}
                        disabled={quoting || normalized.resolution_status !== 'resolved'}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {quoting ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
                        Báo giá Viettel Post
                      </button>
                    </div>
                  ) : null}

                  {quote ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 text-sm font-bold text-slate-900">3. Chọn dịch vụ</div>
                      {availableServices.length ? (
                        <div className="space-y-3">
                          {availableServices.map((service) => (
                            <label
                              key={service.service_code}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                                selectedServiceCode === service.service_code
                                  ? 'border-emerald-300 bg-emerald-50'
                                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                className="mt-1"
                                checked={selectedServiceCode === service.service_code}
                                onChange={() => {
                                  setSelectedServiceCode(service.service_code);
                                  setSelectedServiceName(service.service_name || '');
                                  setSelectedAddCodes((quote.recommended_service_add_codes || []).filter((code) => service.supported_add_codes?.includes(code)));
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm font-bold text-slate-900">{service.service_name || service.service_code}</div>
                                  <div className="text-sm font-bold text-emerald-700">{formatCurrency(service.fee)}</div>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Mã {service.service_code}{service.eta_text ? ` • ${service.eta_text}` : ''}
                                </div>
                                {selectedServiceCode === service.service_code && service.supported_add_services?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {service.supported_add_services.map((extra) => (
                                      <label key={extra.code} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                                        <input
                                          type="checkbox"
                                          checked={selectedAddCodes.includes(extra.code)}
                                          onChange={() => toggleAddCode(extra.code)}
                                        />
                                        <span>{extra.code}</span>
                                        <span className="text-slate-400">•</span>
                                        <span>{extra.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          Viettel Post không trả về dịch vụ nào cho địa chỉ này.
                        </div>
                      )}

                      <button
                        onClick={handleCreateShipment}
                        disabled={creating || !selectedServiceCode}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      >
                        {creating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        Tạo vận đơn thật
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                    <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold">Chứng chỉ này đã có vận đơn đang hoạt động.</div>
                      <div className="mt-1 text-sm">
                        V1 không cho tạo vận đơn mới chồng lên vận đơn hiện tại. Anh/chị có thể copy mã vận đơn hoặc xem lại trạng thái ở khối bên trái.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {normalized && normalized.resolution_status !== 'resolved' ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700 shadow-sm">
                  <div className="mb-1 flex items-center gap-2 font-bold">
                    <XCircle size={16} />
                    Địa chỉ chưa đủ rõ để tạo đơn thật
                  </div>
                  <div>Cần chuẩn hóa ra được `address_line`, `province_id`, `district_id`, `ward_id` và trạng thái `resolved`.</div>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Đóng
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
