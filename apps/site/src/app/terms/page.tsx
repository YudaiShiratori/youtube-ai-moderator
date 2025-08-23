export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black py-16">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">利用規約</h1>
        
        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. サービスの提供</h2>
            <p className="text-gray-300 mb-4">
              YouTube AI Moderator（以下「本拡張機能」）は、YouTubeのコメントを
              自動的に検出・フィルタリングするブラウザ拡張機能です。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. 利用条件</h2>
            <p className="text-gray-300 mb-4">
              本拡張機能を利用するにあたり、以下の条件に同意いただく必要があります：
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>本拡張機能を違法な目的で使用しないこと</li>
              <li>YouTubeの利用規約を遵守すること</li>
              <li>他のユーザーの権利を侵害しないこと</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. 免責事項</h2>
            <p className="text-gray-300 mb-4">
              本拡張機能は「現状有姿」で提供されます。以下の点についてご了承ください：
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>AIによる検出のため、誤検知や見逃しが発生する可能性があります</li>
              <li>本拡張機能の使用により生じた損害について、開発者は責任を負いません</li>
              <li>YouTubeの仕様変更により、機能が正常に動作しなくなる可能性があります</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. 知的財産権</h2>
            <p className="text-gray-300 mb-4">
              本拡張機能に関する全ての知的財産権は、開発者に帰属します。
              ただし、オープンソースライセンスに基づく部分については、
              それぞれのライセンス条項が適用されます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. 変更と終了</h2>
            <p className="text-gray-300 mb-4">
              開発者は、以下の権利を有します：
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>本利用規約を予告なく変更する権利</li>
              <li>本拡張機能の提供を終了する権利</li>
              <li>特定のユーザーのアクセスを制限する権利</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. 準拠法</h2>
            <p className="text-gray-300 mb-4">
              本利用規約は、日本国の法律に準拠し、解釈されるものとします。
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