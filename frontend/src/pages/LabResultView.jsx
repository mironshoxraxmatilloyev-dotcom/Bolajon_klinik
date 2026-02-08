import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import laboratoryService from '../services/laboratoryService';
import toast from 'react-hot-toast';

export default function LabResultView() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadResult();
  }, [orderId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const response = await laboratoryService.getOrderResult(orderId);
      setResult(response.data);
    } catch (error) {
      toast.error('Natijani yuklashda xatolik');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400">Natija topilmadi</p>
          <button
            onClick={() => navigate('/laboratory')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  const isBiochemistry = result.test_name?.toLowerCase().includes('биохимия') || 
                         result.test_name?.toLowerCase().includes('biochem');
  
  const isBloodTest = result.test_name?.toLowerCase().includes('умумий қон') || 
                      result.test_name?.toLowerCase().includes('қон таҳлили') ||
                      result.test_name?.toLowerCase().includes('blood');
  
  const isVitaminD = result.test_name?.toLowerCase().includes('витамин д') || 
                     result.test_name?.toLowerCase().includes('витамин d') ||
                     result.test_name?.toLowerCase().includes('vitamin d');
  
  const isTorch = result.test_name?.toLowerCase().includes('торч') || 
                  result.test_name?.toLowerCase().includes('torch') ||
                  result.test_name?.toLowerCase().includes('тorch');
  
  const isUrine = result.test_name?.toLowerCase().includes('сийдик') || 
                  result.test_name?.toLowerCase().includes('сиёдик') ||
                  result.test_name?.toLowerCase().includes('мочи') ||
                  result.test_name?.toLowerCase().includes('urine');
  
  const isHormone = result.test_name?.toLowerCase().includes('гормон') || 
                    result.test_name?.toLowerCase().includes('hormone');
  
  const isOncomarker = result.test_name?.toLowerCase().includes('онкомаркер') || 
                       result.test_name?.toLowerCase().includes('oncomarker') ||
                       result.test_name?.toLowerCase().includes('онко');
  
  const isCoagulogram = result.test_name?.toLowerCase().includes('коагулограмма') || 
                        result.test_name?.toLowerCase().includes('коагуло') ||
                        result.test_name?.toLowerCase().includes('coagulo');
  
  const isLipid = result.test_name?.toLowerCase().includes('липид') || 
                  result.test_name?.toLowerCase().includes('lipid');
  
  const isProcalcitonin = result.test_name?.toLowerCase().includes('прокальцитонин') || 
                          result.test_name?.toLowerCase().includes('procalcitonin') ||
                          result.test_name?.toLowerCase().includes('прокал');
  
  const isTroponin = result.test_name?.toLowerCase().includes('тропонин') || 
                     result.test_name?.toLowerCase().includes('troponin') ||
                     result.test_name?.toLowerCase().includes('тропон');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Print tugmalari - faqat ekranda ko'rinadi */}
      <div className="no-print sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/laboratory')}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Орқага
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">print</span>
            Чоп этиш
          </button>
        </div>
      </div>

      {/* Natija - A4 format */}
      <div className="max-w-5xl mx-auto p-8 print:p-0">
        <div className="bg-white print:shadow-none shadow-lg rounded-lg print:rounded-none p-8 print:p-12">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-300">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Bolajon Med Klinikasi</h1>
                <p className="text-sm text-gray-600">Диагностика ва даволаш маркази</p>
                <p className="text-sm text-gray-600">052- рақамли тиббий хужжат шакли</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">Ўзбекистон Республикаси</p>
              <p>Соғлиқни сақлаш вазирининг</p>
              <p>2020 йил 31 декабрдаги №363-сонли</p>
              <p>буйруғи билан тасдиқланган</p>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-black text-center text-green-600 mb-8">
            {isBiochemistry ? 'БИОХИМИК ТАҲЛИЛ' : 
             isBloodTest ? 'УМУМИЙ ҚОН ТАҲЛИЛИ' : 
             isVitaminD ? 'АНАЛИЗ КРОВИ НА ВИТАМИН D' :
             isTorch ? 'АНАЛИЗ КРОВИ НА ТОРЧ ИНФЕКЦИЯ' :
             isUrine ? 'СИЙДИК ТАҲЛИЛИ' :
             isHormone ? 'ГОРМОН ТАҲЛИЛИ' :
             isOncomarker ? 'АНАЛИЗ КРОВИ НА ОНКОМАРКЕРЫ' :
             isCoagulogram ? 'Коагулограмма №' :
             isLipid ? 'Липидный спектр №' :
             isProcalcitonin ? 'Анализ крови на д-димер, прокальцитонин, ферритин №' :
             isTroponin ? 'Анализ крови на Экспресс тест №' :
             result.test_name?.toUpperCase()}
          </h2>
          
          {isCoagulogram && (
            <p className="text-center text-lg font-bold mb-6">(Humaclot JUNIOR)</p>
          )}
          
          {isProcalcitonin && (
            <p className="text-center text-red-600 font-bold mb-6">Human mindray MR-96A (Иммуноферментный анализ)</p>
          )}
          
          {isTroponin && (
            <p className="text-center text-red-600 font-bold mb-6">Human mindray MR-96A (Иммуноферментный анализ)</p>
          )}

          {/* Patient Info */}
          {!isCoagulogram ? (
            <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
              <div>
                <span className="text-gray-600">Сана:</span>
                <span className="ml-2 font-semibold border-b border-gray-400 inline-block min-w-[120px]">
                  {new Date(result.order_date).toLocaleDateString('uz-UZ')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Тартиб рақами:</span>
                <span className="ml-2 font-semibold border-b border-gray-400 inline-block min-w-[120px]">
                  {result.order_number}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Ёш:</span>
                <span className="ml-2 font-semibold border-b border-gray-400 inline-block min-w-[120px]">
                  {result.patient_age || '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-8 text-sm">
              <div className="mb-3">
                <span className="text-gray-600">Сана:</span>
                <span className="ml-2 font-semibold border-b border-gray-400 inline-block min-w-[200px]">
                  {new Date(result.order_date).toLocaleDateString('uz-UZ')}
                </span>
              </div>
            </div>
          )}

          <div className="mb-8">
            <span className="text-gray-600 text-sm">{isCoagulogram ? 'ИФО:' : 'Фамилияси, Исми:'}</span>
            <span className="ml-2 font-bold text-lg border-b-2 border-gray-400 inline-block min-w-[400px]">
              {result.patient_name}
            </span>
          </div>
          
          {isCoagulogram && (
            <>
              <div className="mb-4">
                <span className="text-gray-600 text-sm">Туғилган йили:</span>
                <span className="ml-2 font-semibold border-b border-gray-400 inline-block min-w-[200px]">
                  {result.patient_age ? new Date().getFullYear() - result.patient_age : '—'}
                </span>
              </div>
              <div className="mb-8">
                <span className="text-gray-600 text-sm">Манзил:</span>
                <span className="ml-2 font-semibold border-b border-gray-400 inline-block min-w-[400px]">
                  {result.patient_address || '—'}
                </span>
              </div>
            </>
          )}

          {/* Results Table */}
          {isBiochemistry && result.test_results ? (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-red-600">№</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-red-600">ТАҲЛИЛ НОМИ</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-red-600">НАТИЖА</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-red-600">МЕ'ЁР</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-red-600">ЎЛЧОВ БИРЛИГИ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-gray-800 px-4 py-3 font-semibold">{index + 1}.</td>
                      <td className="border-2 border-gray-800 px-4 py-3 font-bold">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold whitespace-pre-line">{param.normal_range}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold">{param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isBloodTest && result.test_results ? (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-3 py-3 text-center font-bold text-red-600">Показатель</th>
                    <th className="border-2 border-gray-800 px-3 py-3 text-center font-bold text-red-600">Результат</th>
                    <th className="border-2 border-gray-800 px-3 py-3 text-center font-bold text-red-600">Норма<br/>Erkak | Ayol</th>
                    <th className="border-2 border-gray-800 px-3 py-3 text-center font-bold text-red-600">Единица<br/>измерения</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-gray-800 px-3 py-2 font-bold text-sm whitespace-pre-line">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-3 py-2 text-center font-semibold">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-3 py-2 text-center text-blue-600 font-semibold whitespace-pre-line">{param.normal_range}</td>
                      <td className="border-2 border-gray-800 px-3 py-2 text-center text-blue-600 font-semibold">{param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isVitaminD && result.test_results ? (
            <div className="overflow-x-auto">
              <p className="text-center text-red-600 font-bold mb-4">Human mindray MR-96A (Иммуноферментный анализ)</p>
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-yellow-600">Наименивование анализа</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-yellow-600">Результат</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-yellow-600">Норма</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className="bg-white">
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-bold">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold text-lg">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-sm text-blue-600 font-semibold">
                        <div className="space-y-1">
                          <p>Выраженный дефицит-<span className="font-bold">0,1-9нг/мл</span></p>
                          <p>Достоточный уровень-<span className="font-bold">30-100нг/мл</span></p>
                          <p>Умеренный дефицит-<span className="font-bold">10-29нг/мл</span></p>
                          <p>Возможен токсичуский эффект-<span className="font-bold">101-200нг/мл</span></p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isTorch && result.test_results ? (
            <div className="overflow-x-auto">
              <p className="text-center text-red-600 font-bold mb-4">Human mindray MR-96A (Иммуноферментный анализ)</p>
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Наименивование анализа</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Результат</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Норма(ОП)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className="bg-white">
                      <td className="border-2 border-gray-800 px-4 py-3 text-left font-bold italic">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold text-lg">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold whitespace-pre-line">{param.normal_range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isUrine && result.test_results ? (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-green-600" colSpan="2">ФИЗИК-КИМЁВИЙ ХОССАСИ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.slice(0, 5).map((param, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-gray-800 px-4 py-3 font-bold w-1/2">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold">{param.value || '—'} {param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-green-600" colSpan="2">МИКРОСКОПИЯ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.slice(5).map((param, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-gray-800 px-4 py-3 font-bold w-1/2">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold">{param.value || '—'} {param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isHormone && result.test_results ? (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-orange-600">Наименивование анализа</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-orange-600">Результат</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-orange-600">Норма</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-orange-600">Единица измерения</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-gray-800 px-4 py-3 text-left font-bold">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold text-lg">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold whitespace-pre-line">{param.normal_range}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold">{param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isOncomarker && result.test_results ? (
            <div className="overflow-x-auto">
              <p className="text-center text-red-600 font-bold mb-4">Human mindray MR-96A (Иммуноферментный анализ)</p>
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-red-600">Наименивование анализа</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-red-600">Результат</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-red-600">Норма</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-gray-800 px-4 py-3 text-left font-bold">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold text-lg">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold whitespace-pre-line text-sm">{param.normal_range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isCoagulogram && result.test_results ? (
            <div>
              {/* 2 ta jadval yonma-yon */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Birinchi jadval */}
                <div>
                  <table className="w-full border-2 border-gray-800">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Таҳлил номи</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Натижа</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Норма</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Ўлчов бирлиги</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.test_results.map((param, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center font-bold">{param.parameter_name}</td>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center font-semibold">{param.value || '—'}</td>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center text-blue-600 font-semibold">{param.normal_range}</td>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center text-blue-600 font-semibold">{param.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Ikkinchi jadval (bir xil) */}
                <div>
                  <table className="w-full border-2 border-gray-800">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Таҳлил номи</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Натижа</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Норма</th>
                        <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-sm">Ўлчов бирлиги</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.test_results.map((param, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center font-bold">{param.parameter_name}</td>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center font-semibold">{param.value || '—'}</td>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center text-blue-600 font-semibold">{param.normal_range}</td>
                          <td className="border-2 border-gray-800 px-3 py-2 text-center text-blue-600 font-semibold">{param.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : isLipid && result.test_results ? (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold">Показатель</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold">Результат</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold">Норма</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-gray-800 px-4 py-3 text-left font-bold">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold text-lg">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-left text-blue-600 font-semibold whitespace-pre-line text-sm">{param.normal_range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isProcalcitonin && result.test_results ? (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Наименивание анализа</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Результат</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Норма</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className="bg-white">
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-bold">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold text-lg">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold">{param.normal_range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isTroponin && result.test_results ? (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-800 mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Наименивание анализа</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Результат</th>
                    <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-purple-600">Норма</th>
                  </tr>
                </thead>
                <tbody>
                  {result.test_results.map((param, index) => (
                    <tr key={index} className="bg-white">
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-bold">{param.parameter_name}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center font-semibold text-lg">{param.value || '—'}</td>
                      <td className="border-2 border-gray-800 px-4 py-3 text-center text-blue-600 font-semibold">{param.normal_range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-300">
              <h3 className="font-bold text-lg mb-4">Натижа:</h3>
              <div className="whitespace-pre-wrap font-mono text-sm">
                {result.test_results?.[0]?.value || result.result_text || 'Натижа киритилмаган'}
              </div>
            </div>
          )}

          {/* Notes */}
          {result.notes && (
            <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-300">
              <h3 className="font-bold mb-2">Изоҳлар:</h3>
              <p className="text-sm">{result.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t-2 border-gray-300">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-600 mb-2">Лаборант:</p>
                <p className="font-semibold text-lg border-b-2 border-gray-400 inline-block min-w-[250px] pb-1">
                  {result.laborant_name || '___________________'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Натижа тасдиқланди:</p>
                <p className="text-sm font-semibold">
                  {result.approved_at ? new Date(result.approved_at).toLocaleString('uz-UZ') : 'Тасдиқланмаган'}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code placeholder */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>Ушбу ҳужжат электрон тарзда яратилган ва имзо талаб қилмайди</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
