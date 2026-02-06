const Lab = () => {
  const tests = [
    { id: 'LAB-001', patient: 'Aziza Karimova', test: 'Complete Blood Count', status: 'completed', date: '2026-01-20' },
    { id: 'LAB-002', patient: 'Bobur Tursunov', test: 'Urinalysis', status: 'pending', date: '2026-01-21' },
    { id: 'LAB-003', patient: 'Dilnoza Saidova', test: 'Lipid Panel', status: 'in-progress', date: '2026-01-21' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Laboratory</h1>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined">add</span>
          New Test Request
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold mb-6">Test Queue</h2>
        <div className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">biotech</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{test.patient}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{test.id} • {test.test}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{test.date}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  test.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  test.status === 'in-progress' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}>
                  {test.status}
                </span>
                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">
                  {test.status === 'completed' ? 'View Results' : 'Upload Results'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lab;
