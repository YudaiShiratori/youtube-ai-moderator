const features = [
  {
    title: 'AI検出',
    description: '高度なAIアルゴリズムで、スパムや暴言を自動検出',
    icon: '🤖',
  },
  {
    title: 'カスタマイズ可能',
    description: '検出レベルや表示方法を自由に調整',
    icon: '⚙️',
  },
  {
    title: 'プライバシー重視',
    description: 'データは一切外部送信されません',
    icon: '🔒',
  },
  {
    title: 'リアルタイム処理',
    description: '新しいコメントも即座に検出',
    icon: '⚡',
  },
  {
    title: '6つのカテゴリ',
    description: '暴言、ネタバレ、スパムなど多様な検出',
    icon: '📊',
  },
  {
    title: '軽量動作',
    description: 'YouTubeの動作を妨げません',
    icon: '🚀',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            主な機能
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            AIを活用した強力なコメントフィルタリング機能
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="bg-gray-800 rounded-lg p-8">
                <dt className="flex items-center gap-x-3 text-xl font-semibold text-white">
                  <span className="text-3xl">{feature.icon}</span>
                  {feature.title}
                </dt>
                <dd className="mt-4 text-base text-gray-400">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}