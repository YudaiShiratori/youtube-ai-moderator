export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            YouTube AI Moderator
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-200">
            AIがYouTubeコメントを自動でフィルタリング。<br />
            快適な視聴体験を実現します。
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="#install"
              className="rounded-md bg-white px-6 py-3 text-base font-semibold text-purple-700 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              無料でインストール
            </a>
            <a
              href="#features"
              className="text-base font-semibold leading-6 text-white hover:text-gray-200"
            >
              機能を見る <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    </section>
  )
}