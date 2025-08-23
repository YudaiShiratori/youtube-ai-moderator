export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black py-16">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">プライバシーポリシー</h1>
        
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. データの収集について</h2>
            <p className="text-gray-300 mb-4">
              YouTube AI Moderatorは、ユーザーのプライバシーを最優先に考えて設計されています。
              本拡張機能は以下の原則に基づいて動作します：
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>個人情報の収集は一切行いません</li>
              <li>コメント内容はローカルでのみ処理されます</li>
              <li>外部サーバーへのデータ送信は行いません</li>
              <li>閲覧履歴の追跡は行いません</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. ローカル処理</h2>
            <p className="text-gray-300 mb-4">
              全てのコメント検出・フィルタリング処理は、お使いのブラウザ内で完結します。
              YouTubeのコメントデータは、検出処理のためにメモリ上で一時的に参照されますが、
              保存や外部送信されることはありません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. 設定データの保存</h2>
            <p className="text-gray-300 mb-4">
              ユーザーの設定（検出レベル、NGキーワード、NGユーザーなど）は、
              ブラウザのローカルストレージに保存されます。このデータは：
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>お使いのデバイス内にのみ保存されます</li>
              <li>他のウェブサイトやサービスからはアクセスできません</li>
              <li>拡張機能をアンインストールすると自動的に削除されます</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. 権限の使用</h2>
            <p className="text-gray-300 mb-4">
              本拡張機能が要求する権限は、機能の提供に必要最小限のものです：
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>storage</strong>: 設定の保存</li>
              <li><strong>activeTab</strong>: YouTubeページでの動作</li>
              <li><strong>host_permissions (youtube.com)</strong>: YouTubeコメントの読み取り</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. 第三者との共有</h2>
            <p className="text-gray-300 mb-4">
              本拡張機能は、いかなる第三者ともデータを共有しません。
              広告ネットワーク、分析サービス、その他の外部サービスとの連携は一切ありません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. お問い合わせ</h2>
            <p className="text-gray-300">
              プライバシーに関するご質問やご懸念がある場合は、
              <a href="mailto:support@example.com" className="text-purple-400 hover:text-purple-300">
                support@example.com
              </a>
              までお問い合わせください。
            </p>
          </section>

          <section>
            <p className="text-gray-400 text-sm">
              最終更新日: 2024年1月1日
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}