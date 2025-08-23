export default function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            料金プラン
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            基本機能は永久無料。プレミアム機能で更に快適に。
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-gray-800 p-8 shadow-xl ring-1 ring-gray-700">
            <h3 className="text-2xl font-bold text-white">無料版</h3>
            <p className="mt-4 text-4xl font-bold text-white">
              ¥0<span className="text-lg font-normal text-gray-400">/月</span>
            </p>
            <ul className="mt-8 space-y-3">
              {[
                '基本的なフィルタリング機能',
                '6つのカテゴリ検出',
                '検出レベル調整',
                'NGキーワード10個まで',
                'NGユーザー10人まで',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-gray-300">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href="#install"
              className="mt-8 block rounded-md bg-gray-700 px-6 py-3 text-center text-base font-semibold text-white hover:bg-gray-600"
            >
              無料で始める
            </a>
          </div>
          
          <div className="rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-800 p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-white">プレミアム</h3>
            <p className="mt-4 text-4xl font-bold text-white">
              ¥500<span className="text-lg font-normal text-gray-200">/月</span>
            </p>
            <ul className="mt-8 space-y-3">
              {[
                '全ての無料版機能',
                'NGキーワード無制限',
                'NGユーザー無制限',
                'カスタムフィルター作成',
                '優先サポート',
                '広告非表示',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-white">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href="https://buy.stripe.com/example"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 block rounded-md bg-white px-6 py-3 text-center text-base font-semibold text-purple-700 hover:bg-gray-100"
            >
              プレミアムを購入
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}