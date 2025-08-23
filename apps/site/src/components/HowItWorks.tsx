const steps = [
  {
    id: 1,
    title: 'インストール',
    description: 'Chrome Web Storeから拡張機能をインストール',
  },
  {
    id: 2,
    title: '設定',
    description: 'お好みに応じて検出レベルや表示方法を調整',
  },
  {
    id: 3,
    title: '自動フィルタリング',
    description: 'YouTubeを開くだけで自動的にコメントをフィルタリング',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            使い方
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            3ステップで簡単導入
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-purple-600 to-indigo-600"></div>
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`relative flex items-center ${
                  index % 2 === 0 ? 'justify-start' : 'justify-end'
                } mb-12`}
              >
                <div
                  className={`w-5/12 ${
                    index % 2 === 0 ? 'text-right pr-12' : 'text-left pl-12'
                  }`}
                >
                  <div className="bg-gray-900 rounded-lg p-6 shadow-xl">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold">
                        {step.id}
                      </span>
                      <h3 className="text-xl font-semibold text-white">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-gray-400">{step.description}</p>
                  </div>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}