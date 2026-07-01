// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslation } from '../../utils/translations';
import { formatDateVN } from '../../utils/dateUtils';
import api from '../../services/api';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Search, Award, Calendar, Hash, User, ShieldCheck } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import SEO from '../../components/common/SEO';

export default function CertificateLookup() {
  const { language } = useLanguage();
  const t = (key) => getTranslation(key, language);

  const [searchMethod, setSearchMethod] = useState('cccd');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Tra cuu chung chi',
      description: 'Cong cu tra cuu va xac minh thong tin van bang, chung chi do Van Trang Education cap.',
      url: 'https://vantrangedu.com/certificate/lookup'
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Tra cuu chung chi', item: 'https://vantrangedu.com/certificate/lookup' }
      ]
    }
  ];

  const container = useRef();

  useGSAP(() => {
    if (!container.current) return;
    gsap.fromTo('.anim-fade-up',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, { scope: container });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchValue) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.searchCertificate(searchValue, searchMethod);
      setResult(data);

      // Animate result card
      setTimeout(() => {
        gsap.fromTo('.anim-result',
          { scale: 0.95, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.2)' }
        );
      }, 50);

    } catch (err) {
      setError(err.message || 'Không tìm thấy thông tin chứng chỉ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernPublicLayout>
      <SEO
        title="Tra cuu chung chi"
        description="Tra cuu thong tin van bang, chung chi duoc cap boi Van Trang Education theo CCCD hoac ma chung chi."
        url="/certificate/lookup"
        structuredData={structuredData}
      />
      <div ref={container} className="min-h-screen bg-slate-50 py-12 sm:py-16 md:py-24 relative overflow-hidden">
        {/* Abstract Backgrounds */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[100px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[80px] opacity-50 pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <div className="container px-4 mx-auto max-w-3xl relative z-10">
          <div className="text-center mb-12 anim-fade-up">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-100 text-emerald-600 rounded-full mb-6">
              <Award size={40} className="drop-shadow-sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              {t('certificateLookup')}
            </h1>
            <p className="text-lg text-slate-600 font-light max-w-xl mx-auto">
              Tra cứu thông tin văn bằng, chứng chỉ được cấp bởi trung tâm hoàn toàn trực tuyến và chính xác.
            </p>
          </div>

          <Card className="glass-panel border-0 shadow-xl bg-white/80 rounded-[2rem] overflow-hidden anim-fade-up mb-8">
            <CardContent className="p-8 md:p-10">
              <div className="flex p-1 bg-slate-100/80 rounded-2xl mb-8 w-fit mx-auto backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setSearchMethod('cccd')}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 min-h-[48px] ${searchMethod === 'cccd' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  {t('searchByCCCD')}
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMethod('code')}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 min-h-[48px] ${searchMethod === 'code' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  {t('searchByCode')}
                </button>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                    <Search size={20} />
                  </div>
                  <Input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={searchMethod === 'cccd' ? t('enterCCCD') : t('enterCertificateCode')}
                    className="pl-12 h-14 bg-white/60 border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20 text-lg rounded-2xl"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all w-full md:w-auto text-lg shrink-0"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('searching')}
                    </span>
                  ) : t('search')}
                </Button>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-3">
                  <div className="p-1 bg-red-100 rounded-full shrink-0"><ShieldCheck size={16} /></div>
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {result && (
            <Card className="anim-result glass-panel border border-emerald-100 shadow-xl shadow-emerald-900/5 bg-gradient-to-br from-white to-emerald-50/30 rounded-[2rem] overflow-hidden">
              <div className="bg-emerald-600 px-8 py-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                  <Award size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{t('certificateInfo')}</h2>
                  <p className="text-emerald-100 text-sm font-medium opacity-90">KẾT QUẢ TRA CỨU HỢP LỆ</p>
                </div>
              </div>
              <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2"><User size={16} /> {t('fullName')}</span>
                    <p className="text-lg font-bold text-slate-900">{result.fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2"><Calendar size={16} /> {t('dob')}</span>
                    <p className="text-lg font-semibold text-slate-700">{formatDateVN(result.dob)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2"><Award size={16} /> {t('certificateType')}</span>
                    <p className="text-lg font-bold text-emerald-700">{result.certificateType}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2"><ShieldCheck size={16} /> {t('ranking')}</span>
                    <div className="inline-block mt-1 px-3 py-1 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-100">{result.ranking}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2"><Calendar size={16} /> {t('issueDate')}</span>
                    <p className="text-lg font-semibold text-slate-700">{formatDateVN(result.issueDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2"><Hash size={16} /> {t('certificateCode')}</span>
                    <p className="text-xl font-black text-slate-900 tracking-wider font-mono bg-slate-100 px-3 py-1 rounded w-fit">{result.certificateCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </ModernPublicLayout>
  );
}
