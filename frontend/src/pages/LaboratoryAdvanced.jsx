import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../components/dashboard/StatusBadge';

const LaboratoryAdvanced = () => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('orders');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(null);

  const testCatalog = [
    { id: 1, name: 'Complete Blood Count (CBC)', code: 'LAB-001', tubeColor: 'purple', price: 50000, turnaround: '2 hours' },
    { id: 2, name: 'Urinalysis', code: 'LAB-002', tubeColor: 'yellow', price: 30000, turnaround: '1 hour' },
    { id: 3, name: 'Lipid Panel', code: 'LAB-003', tubeColor: 'red', price: 85000, turnaround: '4 hours' },
    { id: 4, name: 'Liver Function Test', code: 'LAB-004', tubeColor: 'red', price: 95000, turnaround: '4 hours' },
    { id: 5, name: 'Blood Glucose', code: 'LAB-005', tubeColor: 'gray', price: 25000, turnaround: '30 min' },
  ];

  const orders = [
    {
      id: 'ORD-001',
      patient: 'Aziza Karimova',
      patientId: '#8821',
      tests: [1, 2],
      status: 'completed',
      ordered: '2026-01-23 09:00',
      collected: '2026-01-23 09:15',
      completed: '2026-01-23 11:30',
      validated: true,
      qrCode: 'QR-ORD-001',
    },
    {
      id: 'ORD-002',
      patient: 'Bobur Tursunov',
      patientId: '#8822',
      tests: [3, 4],
      status: 'pending-validation',
      ordered: '2026-01-23 10:00',
      collected: '2026-01-23 10:15',
      completed: '2026-01-23 14:00',
      validated: false,
      qrCode: 'QR-ORD-002',
    },
    {
      id: 'ORD-003',
      patient: 'Dilnoza Saidova',
      patientId: '#8823',
      tests: [1, 5],
      status: 'in-progress',
      ordered: '2026-01-23 11:00',
      collected: '2026-01-23 11:15',
      completed: null,
      validated: false,
      qrCode: 'QR-ORD-003',
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('lab.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('lab.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowOrderForm(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          {t('lab.newTestOrder')}
        </button>
      </div>

      {/* View Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'orders', label: 'Test Orders', icon: 'assignment' },
            { id: 'samples', label: 'Sample Tracking', icon: 'science' },
            { id: 'results', label: 'Results', icon: 'lab_profile' },
            { id: 'validation', label: 'Validation Queue', icon: 'verified' },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeView === view.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{view.icon}</span>
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Views */}
      {activeView === 'orders' && <OrdersView orders={orders} testCatalog={testCatalog} onShowResult={setShowResultForm} onShowPrint={setShowPrintPreview} />}
      {activeView === 'samples' && <SampleTrackingView orders={orders} testCatalog={testCatalog} />}
      {activeView === 'results' && <ResultsView orders={orders} onShowResult={setShowResultForm} />}
      {activeView === 'validation' && <ValidationView orders={orders} onShowPrint={setShowPrintPreview} />}

      {/* Modals */}
      {showOrderForm && <OrderFormModal testCatalog={testCatalog} onClose={() => setShowOrderForm(false)} />}
      {showResultForm && <ResultInputModal order={showResultForm} testCatalog={testCatalog} onClose={() => setShowResultForm(null)} />}
      {showPrintPreview && <PrintPreviewModal order={showPrintPreview} testCatalog={testCatalog} onClose={() => setShowPrintPreview(null)} />}
    </div>
  );
};

// Orders View
const OrdersView = ({ orders, testCatalog, onShowResult, onShowPrint }) => {
  const getTubeColor = (tubeColor) => {
    const colors = {
      purple: 'bg-purple-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      gray: 'bg-gray-500',
      blue: 'bg-green-500',
    };
    return colors[tubeColor] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="size-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-3xl">biotech</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{order.id}</h3>
                  <StatusBadge
                    status={
                      order.status === 'completed' ? 'success' :
                      order.status === 'pending-validation' ? 'warning' :
                      'info'
                    }
                    text={order.status.toUpperCase().replace('-', ' ')}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {order.patient} ({order.patientId})
                </p>
                <p className="text-xs text-gray-500 mt-1">Ordered: {order.ordered}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center">
              <div className="size-20 bg-gray-900 rounded-lg grid grid-cols-4 gap-0.5 p-1">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className={`${Math.random() > 0.5 ? 'bg-white' : 'bg-gray-900'}`}></div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{order.qrCode}</p>
            </div>
          </div>

          {/* Tests */}
          <div className="mb-4">
            <p className="text-sm font-semibold mb-2">Tests Ordered:</p>
            <div className="flex flex-wrap gap-2">
              {order.tests.map((testId) => {
                const test = testCatalog.find(t => t.id === testId);
                return (
                  <div key={testId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className={`size-4 ${getTubeColor(test.tubeColor)} rounded-full`}></div>
                    <span className="text-sm font-semibold">{test.name}</span>
                    <span className="text-xs text-gray-500">({test.code})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {order.status === 'in-progress' && (
              <button
                onClick={() => onShowResult(order)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Enter Results
              </button>
            )}
            {order.status === 'completed' && (
              <button
                onClick={() => onShowPrint(order)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">print</span>
                Print Report
              </button>
            )}
            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700">
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Sample Tracking View
const SampleTrackingView = ({ orders, testCatalog }) => {
  const getTubeColor = (tubeColor) => {
    const colors = {
      purple: 'bg-purple-500 border-purple-600',
      red: 'bg-red-500 border-red-600',
      yellow: 'bg-yellow-500 border-yellow-600',
      gray: 'bg-gray-500 border-gray-600',
    };
    return colors[tubeColor] || 'bg-gray-500';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Order ID</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Tube Type</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Collection Time</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">QR Code</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {orders.map((order) => (
            order.tests.map((testId, idx) => {
              const test = testCatalog.find(t => t.id === testId);
              return (
                <tr key={`${order.id}-${testId}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 font-semibold">{order.id}-{idx + 1}</td>
                  <td className="px-6 py-4">{order.patient}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`size-8 ${getTubeColor(test.tubeColor)} rounded-full border-2`}></div>
                      <span className="text-sm font-semibold capitalize">{test.tubeColor} Top</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{order.collected}</td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      status={order.status === 'completed' ? 'success' : 'warning'}
                      text={order.status}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="size-12 bg-gray-900 rounded grid grid-cols-3 gap-0.5 p-0.5">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className={`${Math.random() > 0.5 ? 'bg-white' : 'bg-gray-900'}`}></div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Results View
const ResultsView = ({ orders, onShowResult }) => {
  return (
    <div className="space-y-4">
      {orders.filter(o => o.status === 'completed' || o.status === 'pending-validation').map((order) => (
        <div key={order.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{order.patient}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{order.id} • {order.completed}</p>
            </div>
            <button
              onClick={() => onShowResult(order)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
            >
              View Results
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Validation View
const ValidationView = ({ orders, onShowPrint }) => {
  const pendingValidation = orders.filter(o => o.status === 'pending-validation');

  return (
    <div className="space-y-4">
      {pendingValidation.map((order) => (
        <div key={order.id} className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{order.patient}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{order.id} • Awaiting Second Review</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">
                Reject
              </button>
              <button
                onClick={() => onShowPrint(order)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold"
              >
                Approve & Print
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LaboratoryAdvanced;


// Order Form Modal
const OrderFormModal = ({ testCatalog, onClose }) => {
  const [selectedTests, setSelectedTests] = useState([]);
  const [patientId, setPatientId] = useState('');

  const toggleTest = (testId) => {
    setSelectedTests(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-black">New Test Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Patient ID</label>
            <input
              type="text"
              placeholder="Enter patient ID or search..."
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Test Selection */}
          <div>
            <label className="block text-sm font-semibold mb-3">Select Tests</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testCatalog.map((test) => (
                <button
                  key={test.id}
                  onClick={() => toggleTest(test.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedTests.includes(test.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`size-4 ${
                        test.tubeColor === 'purple' ? 'bg-purple-500' :
                        test.tubeColor === 'red' ? 'bg-red-500' :
                        test.tubeColor === 'yellow' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      } rounded-full`}></div>
                      <span className="text-xs text-gray-500">{test.code}</span>
                    </div>
                    {selectedTests.includes(test.id) && (
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm mb-1">{test.name}</p>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>₸ {test.price.toLocaleString()}</span>
                    <span>{test.turnaround}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate QR */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">qr_code</span>
              <div>
                <p className="font-semibold">QR Code will be generated automatically</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unique identifier for sample tracking</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold">
              Create Order & Print Labels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Result Input Modal
const ResultInputModal = ({ order, testCatalog, onClose }) => {
  const cbcResults = [
    { param: 'WBC', value: '8.5', unit: '10³/µL', range: '4.0-11.0', normal: true },
    { param: 'RBC', value: '4.2', unit: '10⁶/µL', range: '4.5-5.5', normal: false },
    { param: 'Hemoglobin', value: '13.5', unit: 'g/dL', range: '13.5-17.5', normal: true },
    { param: 'Hematocrit', value: '40', unit: '%', range: '38-50', normal: true },
    { param: 'Platelets', value: '250', unit: '10³/µL', range: '150-400', normal: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-2xl font-black">Test Results - {order.id}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{order.patient}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Result Entry Table */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Parameter</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Reference Range</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {cbcResults.map((result, idx) => (
                  <tr key={idx} className={!result.normal ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <td className="px-4 py-3 font-semibold">{result.param}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={result.value}
                        className={`w-24 px-3 py-1 rounded border ${
                          !result.normal
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600 font-bold'
                            : 'border-gray-300 dark:border-gray-600'
                        } focus:outline-none focus:ring-2 focus:ring-primary`}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{result.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{result.range}</td>
                    <td className="px-4 py-3">
                      {result.normal ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold">
                          NORMAL
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-bold animate-pulse">
                          ABNORMAL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Validation Workflow */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-orange-600 text-2xl">verified</span>
              <div className="flex-1">
                <p className="font-bold text-orange-900 dark:text-orange-400 mb-2">Second Review Required</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Results with abnormal values require validation by senior technician
                </p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">
                    Submit for Review
                  </button>
                  <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-semibold">
                    Save Draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Print Preview Modal
const PrintPreviewModal = ({ order, testCatalog, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-black">Print Preview</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {/* A4 Report Preview */}
          <div className="bg-white border-2 border-gray-300 rounded-xl p-12 mb-6" style={{ aspectRatio: '210/297' }}>
            {/* Header */}
            <div className="text-center mb-8 pb-6 border-b-2 border-primary">
              <h1 className="text-4xl font-black text-primary mb-2">VITALIS CLINIC</h1>
              <p className="text-sm text-gray-600">Laboratory Services Department</p>
              <p className="text-sm text-gray-600">Toshkent sh., Amir Temur ko'chasi 123 • Tel: +998 (71) 123-45-67</p>
            </div>

            {/* Report Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-600">Patient Name:</p>
                <p className="font-bold">{order.patient}</p>
              </div>
              <div>
                <p className="text-gray-600">Patient ID:</p>
                <p className="font-bold">{order.patientId}</p>
              </div>
              <div>
                <p className="text-gray-600">Order ID:</p>
                <p className="font-bold">{order.id}</p>
              </div>
              <div>
                <p className="text-gray-600">Report Date:</p>
                <p className="font-bold">{order.completed}</p>
              </div>
            </div>

            {/* Results Table */}
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-3">LABORATORY RESULTS</h3>
              <table className="w-full text-sm border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left">Test</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Result</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Unit</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2">WBC</td>
                    <td className="border border-gray-300 px-3 py-2 font-bold">8.5</td>
                    <td className="border border-gray-300 px-3 py-2">10³/µL</td>
                    <td className="border border-gray-300 px-3 py-2">4.0-11.0</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between pt-6 border-t border-gray-300">
              <div>
                <div className="size-24 bg-gray-900 rounded grid grid-cols-4 gap-1 p-1 mb-2">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className={`${Math.random() > 0.5 ? 'bg-white' : 'bg-gray-900'}`}></div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">Verification: {order.qrCode}</p>
              </div>
              <div className="text-right">
                <div className="border-t-2 border-gray-900 w-48 mb-2"></div>
                <p className="font-bold">Dr. Laboratory Director</p>
                <p className="text-xs text-gray-600">Medical Laboratory Scientist</p>
              </div>
            </div>
          </div>

          {/* Print Buttons */}
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">description</span>
              Print A4 Report
            </button>
            <button className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">receipt</span>
              Print Label (Thermal)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
