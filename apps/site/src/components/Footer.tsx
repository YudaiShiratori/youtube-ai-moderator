export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4">
              YouTube AI Moderator
            </h3>
            <p className="text-gray-400 text-sm">
              YouTubeコメントを自動でフィルタリングし、快適な視聴体験を提供します。
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">リンク</h4>
            <ul className="space-y-2">
              <li>
                <a href="/privacy" className="text-gray-400 hover:text-white text-sm">
                  プライバシーポリシー
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-400 hover:text-white text-sm">
                  利用規約
                </a>
              </li>
              <li>
                <a href="/security" className="text-gray-400 hover:text-white text-sm">
                  セキュリティ
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">サポート</h4>
            <ul className="space-y-2">
              <li>
                <a href="#faq" className="text-gray-400 hover:text-white text-sm">
                  FAQ
                </a>
              </li>
              <li>
                <a href="mailto:support@example.com" className="text-gray-400 hover:text-white text-sm">
                  お問い合わせ
                </a>
              </li>
              <li>
                <a href="https://github.com/example/youtube-ai-moderator" className="text-gray-400 hover:text-white text-sm">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-800">
          <p className="text-center text-gray-400 text-sm">
            © 2024 YouTube AI Moderator. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}