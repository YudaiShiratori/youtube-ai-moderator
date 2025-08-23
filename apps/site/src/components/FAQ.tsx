const faqs = [
  {
    question: 'どのような仕組みでコメントを検出していますか？',
    answer: 'AIによるパターン認識と自然言語処理を組み合わせて、スパム、暴言、ネタバレなどを検出しています。全ての処理はローカルで行われ、外部にデータは送信されません。',
  },
  {
    question: '誤検知はありますか？',
    answer: 'AIによる判定のため、誤検知の可能性はゼロではありません。検出レベルを調整することで、誤検知と見逃しのバランスを調整できます。',
  },
  {
    question: 'YouTubeの利用規約に違反しませんか？',
    answer: 'この拡張機能は、ユーザーのローカル環境でのみ動作し、YouTubeのサービスやサーバーに影響を与えません。表示の変更のみを行うため、利用規約に違反しません。',
  },
  {
    question: 'プライバシーは守られますか？',
    answer: '完全にローカルで動作し、一切の外部通信を行いません。コメント内容や閲覧履歴などの個人情報は収集・送信されません。',
  },
  {
    question: '他の動画サイトでも使えますか？',
    answer: '現在はYouTubeのみに対応しています。今後、他の動画サイトへの対応も検討しています。',
  },
]

export default function FAQ() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            よくある質問
          </h2>
        </div>
        <div className="mx-auto mt-16 max-w-3xl">
          <dl className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question} className="bg-gray-900 rounded-lg p-6">
                <dt className="text-lg font-semibold text-white">
                  {faq.question}
                </dt>
                <dd className="mt-3 text-base text-gray-400">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}