"use client";

import React, { useEffect, useState } from "react";
import { BrandSectionBackground } from "@/components/patterns";
import {
  Headphones,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
} from "lucide-react";

export default function SupportPage() {
  const [topic, setTopic] = useState("WARRANTY");
  const [orderNo, setOrderNo] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ticketCode, setTicketCode] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const phoneLast4 = profilePhone.replace(/\D/g, '').slice(-4);
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/proxy/auth/me', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('auth');
        const body = await response.json();
        const phone = body?.data?.phone;
        const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
        if (digits.length < 9) throw new Error('phone');
        setProfilePhone(phone);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setError('Hãy đăng nhập và kiểm tra số điện thoại trong hồ sơ trước khi tạo phiếu.');
      });
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !description.trim() || !orderNo.trim() || !phoneConfirmed || !phoneLast4) return;
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/proxy/support/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderNo.trim(), title: `Yêu cầu hỗ trợ: ${topic}`, description: description.trim(), confirmedProfilePhone: profilePhone }),
      });
      const body = await response.json();
      if (!response.ok || body?.success !== true || typeof body?.data?.ticketCode !== 'string' || !body.data.ticketCode) {
        throw new Error('unconfirmed');
      }
      setTicketCode(body.data.ticketCode);
      setSubmitted(true);
    } catch {
      setError('Không thể xác nhận phiếu đã được tạo. Vui lòng kiểm tra danh sách phiếu trước khi thử lại.');
    } finally {
      setPending(false);
    }
  };

  return (
    <BrandSectionBackground
      variant="soft-blue"
      pattern="dot"
      patternOpacity={0.05}
      withGlow={true}
      className="min-h-full p-6 sm:p-8 space-y-6"
    >
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Headphones className="w-5 h-5 text-blue-600" />
          Trung Tâm Hỗ Trợ Khách Hàng &amp; Khiếu Nại (UC05)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Gửi yêu cầu bảo hành, đổi trả hoặc phản ánh chất lượng phục vụ. Trợ lý AI và đội ngũ CSKH MWG hỗ trợ 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Ticket Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          {submitted ? (
            <div className="ts-badge-success p-6 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h2 className="text-base font-bold text-slate-900">
                Đã tiếp nhận yêu cầu hỗ trợ!
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Mã phiếu hỗ trợ: <span className="font-mono font-bold text-slate-900">{ticketCode}</span>.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setDescription("");
                  setOrderNo("");
                  setPhoneConfirmed(false);
                  setTicketCode("");
                }}
                className="ts-cta text-xs py-2 px-4 mt-2"
              >
                Gửi yêu cầu khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Tạo Phiếu Hỗ Trợ Mới
              </h2>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Vấn đề cần hỗ trợ:
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="WARRANTY">Yêu cầu bảo hành / Sửa chữa chính hãng</option>
                  <option value="RETURN">Đổi trả sản phẩm lỗi trong 30 ngày</option>
                  <option value="DELIVERY">Khiếu nại giao hàng trễ / Hư hỏng vỏ hộp</option>
                  <option value="REFUND">Yêu cầu bồi hoàn tiền hàng</option>
                  <option value="OTHER">Vấn đề khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Mã đơn hàng của bạn:
                </label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="VD: MWG-20261026-9812"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Mô tả chi tiết tình trạng:
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vui lòng cung cấp chi tiết lỗi của máy hoặc nội dung khiếu nại..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={phoneConfirmed} onChange={(e) => setPhoneConfirmed(e.target.checked)} disabled={!phoneLast4} />
                Xác nhận liên hệ qua số điện thoại trong hồ sơ {phoneLast4 ? `(•••• ${phoneLast4})` : '(chưa có số hợp lệ)'}.
              </label>
              {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

              <button type="submit" disabled={pending || !phoneConfirmed || !phoneLast4} className="ts-cta text-xs py-2.5 px-5 disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />
                <span>{pending ? 'Đang gửi...' : 'Gửi Yêu Cầu Hỗ Trợ'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Quick Help & Hotline */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Câu hỏi thường gặp
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block mb-0.5">Quy trình đổi trả 30 ngày?</span>
                Mang sản phẩm kèm vỏ hộp và hóa đơn đến bất kỳ siêu thị MWG gần nhất để đổi mới 1-1.
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block mb-0.5">Thời gian xử lý bảo hành?</span>
                Tối đa 7-14 ngày làm việc theo cam kết của trung tâm bảo hành ủy quyền chính hãng.
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-5 text-white shadow-sm space-y-2">
            <div className="text-xs font-semibold opacity-90">Tổng Đài CSKH Miễn Cước</div>
            <div className="text-xl font-extrabold tracking-tight">1800 1060</div>
            <div className="text-[11px] opacity-80">Phục vụ từ 7:30 - 22:00 tất cả các ngày trong tuần.</div>
          </div>
        </div>
      </div>
    </BrandSectionBackground>
  );
}
