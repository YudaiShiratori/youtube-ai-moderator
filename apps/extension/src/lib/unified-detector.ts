import { DetectionResult, Category } from '../types';

/**
 * YouTube AI Moderator - 統一検出ロジック
 * ライブチャット・通常コメント共通の判定
 * 文の意味による判定：spoiler, hint, hato, backseat
 */

export class UnifiedCommentDetector {
  private processedComments = new WeakSet<HTMLElement>();
  private recentMessages = new Map<string, { timestamp: number; count: number }>();
  private negativeHistory = new Map<string, Array<{ timestamp: number; text: string }>>(); // ユーザー別ネガティブ履歴
  private lastReset = Date.now();

  /**
   * 共通前処理：正規化と文構造解析
   */
  private normalizeText(text: string): string {
    // Unicode NFKC正規化
    let normalized = text.normalize('NFKC');
    
    // ゼロ幅・結合文字削除
    normalized = normalized.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
    
    // confusables/全角英数の正規化
    const charMap: Record<string, string> = {
      // キリル文字
      'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'т': 't',
      // 全角英数
      'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f',
      'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l',
      'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r',
      'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x',
      'ｙ': 'y', 'ｚ': 'z',
      '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
      '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
    };
    
    for (const [from, to] of Object.entries(charMap)) {
      normalized = normalized.replace(new RegExp(from, 'gi'), to);
    }
    
    return normalized.toLowerCase();
  }

  /**
   * メイン検出エントリーポイント
   */
  detect(text: string, author: string, isLiveChat = false): DetectionResult {
    this.checkAndReset();
    
    const normalized = this.normalizeText(text);
    
    // 笑い単独は通す
    if (/^[wｗw草笑]*$/.test(normalized.replace(/[\s ]/g, ''))) {
      return { blocked: false, category: null, reason: '' };
    }

    // ポジティブ・リスペクト表現の保護
    if (this.isPositiveComment(normalized)) {
      return { blocked: false, category: null, reason: 'ポジティブコメント' };
    }

    // ネタ・ジョークコメントの保護
    if (this.isJokeComment(normalized)) {
      return { blocked: false, category: null, reason: 'ネタコメント' };
    }

    // ネガティブコメント連投チェック（最優先）
    const negativeSpamResult = this.checkNegativeSpam(normalized, author);
    if (negativeSpamResult.blocked) return negativeSpamResult;

    // 配信者への批判的コメントチェック
    const streamerCriticismResult = this.checkStreamerCriticism(normalized);
    if (streamerCriticismResult.blocked) return streamerCriticismResult;

    // 人格攻撃・誹謗中傷チェック
    const personalAttackResult = this.checkPersonalAttacks(normalized);
    if (personalAttackResult.blocked) return personalAttackResult;

    // 1. ネタバレ検出（最重要）
    const spoilerResult = this.detectSpoiler(normalized, isLiveChat);
    if (spoilerResult.blocked) return spoilerResult;

    // 2. 匂わせ検出
    const hintResult = this.detectHint(normalized);
    if (hintResult.blocked) return hintResult;

    // 3. 鳩行為検出
    const hatoResult = this.detectHato(normalized);
    if (hatoResult.blocked) return hatoResult;

    // 4. 指示厨検出
    const backseatResult = this.detectBackseat(normalized, author);
    if (backseatResult.blocked) return backseatResult;

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * ポジティブ・リスペクト表現の判定
   */
  private isPositiveComment(text: string): boolean {
    const positiveTerms = [
      // 感動・感謝
      'すごい', 'すげー', 'すげぇ', '感動', '素晴らしい', 'やばい', 'やべー', 'やべぇ',
      'ありがとう', 'ありがと', 'おつかれ', 'お疲れ', 'おつ', 'がんばって', '頑張って',
      
      // 応援
      '応援', '頑張れ', 'がんばれ', 'ファイト', '楽しみ', '期待', '大好き',
      '好き', '推し', '最高', 'サイコー', '神', 'かみ', '魅力的', '魅力',
      
      // 驚き・感嘆（ポジティブ）
      'びっくり', 'おおー', 'おー', 'わー', 'わぁ', 'すげー',
      '上手い', 'うまい', '天才', 'すごすぎ', 'やばすぎ',
      
      // 配信関連ポジティブ
      '面白い', 'おもしろい', '楽しい', 'たのしい', '配信ありがとう',
      '今日も', 'いつも', '毎回', 'いいね', '良い', 'よい',
      
      // 誇張表現（ポジティブ）
      'めっちゃ', 'メチャ', 'めちゃ', 'メチャクチャ', 'めちゃくちゃ',
      'すっごい', 'スゴイ', 'とても', '本当に', 'ホント'
    ];

    const respectfulTerms = [
      'さん', 'ちゃん', 'くん', '先生', '様', 'マスター'
    ];

    // ポジティブ語が含まれている
    const hasPositive = positiveTerms.some(term => text.includes(term));
    
    // 敬語・丁寧語パターン
    const isPolite = /です|ます|でした|ました|ですね|ますね/.test(text) ||
                     respectfulTerms.some(term => text.includes(term));

    // ポジティブな感嘆符
    const hasPositiveExclamation = /[!！]{1,2}$/.test(text) && hasPositive;

    return hasPositive || isPolite || hasPositiveExclamation;
  }

  /**
   * ネタ・ジョークコメントの判定
   */
  private isJokeComment(text: string): boolean {
    // ネタ・ミーム表現
    const memeTerms = [
      'wktk', 'kwsk', 'ｷﾀ━', 'きた━', 'キタ━', 
      'てぇてぇ', 'tete', 'やったぜ', 'やったー',
      'ぺこぺこ', 'ﾍﾟｺﾍﾟｺ', 'こんぺこ', 'うさ耳',
      '114514', '1919', 'やりますねぇ', 'いいね', '例のアレ'
    ];

    // 誇張表現（ネタっぽい）
    const exaggerationPatterns = [
      /[!！]{3,}/, // 過度な感嘆符
      /[wｗw草笑]{3,}/, // 連続する笑い
      /ー{5,}/, // 長すぎる長音（ネタっぽい）
      /[あぁ]{3,}|[おぉ]{3,}|[えぇ]{3,}/, // 連続する感嘆
    ];

    // 顔文字・AA
    const emoticons = [
      /\(´∀｀\)/, /\(・∀・\)/, /\(｀・ω・´\)/, /\(´・ω・`\)/, /\( ﾟ∀ﾟ\)/,
      /\^q\^/, /\^p\^/, /\(^o^\)/, /\(>_<\)/, /\(≧∀≦\)/,
      /ω/, /σ/, /φ/, /※/, /∩/, /∪/, /※/
    ];

    // 定型文・コピペ風
    const templatePatterns = [
      /^.{1,5}$/, // 短すぎるコメント（単発ネタ）
      /同じ/, /みんな/, /全員/, /一斉に/, /せーの/,
      /コメント欄/, /弾幕/, /統一/, /合わせ/
    ];

    // メタ発言（配信を客観視）
    const metaComments = [
      '配信者', '視聴者', 'リスナー', 'コメント', '弾幕', 'チャット',
      '画面', '音量', '音声', '映像', '配信', 'ライブ',
      'やってる', 'みてる', '見てる', '聞いてる'
    ];

    // 自虐・ツッコミ系
    const selfDeprecating = [
      'だめだ', 'あかん', 'やばい', 'まずい', 'おわた', 'オワタ',
      '終了', '爆死', '撤退', '退散', 'にげる', '逃げる'
    ];

    const hasMeme = memeTerms.some(term => text.includes(term));
    const hasExaggeration = exaggerationPatterns.some(pattern => pattern.test(text));
    const hasEmoticon = emoticons.some(pattern => pattern.test(text));
    const hasTemplate = templatePatterns.some(pattern => pattern.test(text));
    const hasMeta = metaComments.some(term => text.includes(term));
    const hasSelfDeprecating = selfDeprecating.some(term => text.includes(term));

    // ネタコメントの条件
    return hasMeme || hasExaggeration || hasEmoticon || 
           (hasTemplate && text.length < 20) || 
           (hasMeta && !this.hasHostility(text)) ||
           (hasSelfDeprecating && !this.hasHostility(text));
  }

  /**
   * ネガティブコメント連投のチェック
   */
  private checkNegativeSpam(text: string, author: string): DetectionResult {
    const now = Date.now();
    const toneAnalysis = this.analyzeSentenceTone(text);
    
    // ネガティブではない場合、履歴をクリーンアップして終了
    if (toneAnalysis !== 'negative') {
      const userHistory = this.negativeHistory.get(author);
      if (userHistory) {
        // 古い履歴を削除（60秒以上前）
        const filtered = userHistory.filter(entry => now - entry.timestamp < 60000);
        if (filtered.length === 0) {
          this.negativeHistory.delete(author);
        } else {
          this.negativeHistory.set(author, filtered);
        }
      }
      return { blocked: false, category: null, reason: '' };
    }

    // ネガティブコメントの場合、履歴を追加
    if (!this.negativeHistory.has(author)) {
      this.negativeHistory.set(author, []);
    }
    
    const userHistory = this.negativeHistory.get(author)!;
    
    // 古い履歴を削除（60秒以上前）
    const recentHistory = userHistory.filter(entry => now - entry.timestamp < 60000);
    
    // 新しいネガティブコメントを追加
    recentHistory.push({ timestamp: now, text });
    this.negativeHistory.set(author, recentHistory);

    // ネガティブコメントは基本的にブロック（連投関係なく）
    const severityLevel = this.getNegativeSeverity(text);
    
    if (severityLevel === 'severe') {
      // 悪質：即座にブロック
      return { blocked: true, category: 'backseat' as Category, reason: '悪質ネガティブ' };
    }
    
    if (severityLevel === 'moderate') {
      // 中程度：単発でもブロック
      return { blocked: true, category: 'backseat' as Category, reason: 'ネガティブコメント' };
    }

    // 連投パターンもチェック（追加の厳格化）
    if (recentHistory.length >= 2) {
      // 60秒以内に2回以上のネガティブコメント
      return { blocked: true, category: 'backseat' as Category, reason: 'ネガティブ連投' };
    }

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 配信者への批判的コメントの検出（文全体の意図で判断）
   */
  private checkStreamerCriticism(text: string): DetectionResult {
    // 1. 文の構造分析
    const sentenceType = this.analyzeCriticismPattern(text);
    
    if (sentenceType === 'direct_criticism') {
      return { blocked: true, category: 'backseat' as Category, reason: '配信者批判' };
    }
    
    if (sentenceType === 'indirect_criticism') {
      return { blocked: true, category: 'backseat' as Category, reason: '間接批判' };
    }
    
    if (sentenceType === 'comparative_criticism') {
      return { blocked: true, category: 'backseat' as Category, reason: '比較批判' };
    }

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 批判パターンの文構造分析
   */
  private analyzeCriticismPattern(text: string): 'direct_criticism' | 'indirect_criticism' | 'comparative_criticism' | 'none' {
    // 1. 直接批判パターン（二人称 + 否定的評価）
    const directPatterns = [
      // 「あなた/君は〜」形式
      /(?:あなた|君|きみ)(?:は|が|って|の).{0,20}(?:下手|だめ|無理|つまらな|嫌|うざ|きも)/,
      // 「お前〜」形式（攻撃的）
      /(?:お前|おまえ|てめ[えぇ]|こいつ).{0,15}(?:下手|だめ|無理|うざ|きも|消え|死ね|黙)/,
      // 命令形批判
      /(?:やめろ|やめて|帰れ|消えろ|黙れ)(?:よ|！|$)/,
      // 能力否定
      /(?:センス|才能|向い)(?:ない|無い|ねー)(?:ね|よ|な|$)/
    ];

    if (directPatterns.some(pattern => pattern.test(text))) {
      return 'direct_criticism';
    }

    // 2. 間接批判パターン（失望・期待外れ）
    const indirectPatterns = [
      // 失望表現
      /(?:がっかり|ガッカリ|残念|期待外れ|期待はずれ)(?:だ|です|した|$)/,
      // 改善要求
      /(?:直した方がいい|なおしたほうがいい|改善し|反省し)(?:ろ|て|た方が)/,
      // 能力疑問
      /(?:本当に|ほんとに|本気で).{0,10}(?:できる|わかって|やって)(?:の|る|ます)？/
    ];

    if (indirectPatterns.some(pattern => pattern.test(text))) {
      return 'indirect_criticism';
    }

    // 3. 比較批判パターン（他者との比較で劣位を示唆）
    const comparativePatterns = [
      // 他者優位比較
      /(?:他の|別の|前の|昔の).{0,15}(?:方が|ほうが).{0,10}(?:良い|いい|上手|面白|マシ|まし)/,
      // 劣化比較
      /(?:前は|昔は|最初は).{0,10}(?:良かった|よかった|面白かった|まともだった)/,
      // 直接比較
      /(?:[あ-ん]{2,8})(?:の方が|のほうが).{0,10}(?:良い|上手|面白)/
    ];

    if (comparativePatterns.some(pattern => pattern.test(text))) {
      return 'comparative_criticism';
    }

    // 4. 文脈による判定（語調・語尾分析）
    const overallTone = this.analyzeSentenceTone(text);
    
    // ネガティブな文で、配信者を指していそうな文脈
    if (overallTone === 'negative') {
      // 「この人」「配信者」等への言及がある場合
      if (/(?:この人|配信者|実況者|主|ぬし)/.test(text)) {
        return 'indirect_criticism';
      }
      
      // 二人称なしでも、明らかに配信者に向けた否定文
      if (/(?:つまらん|飽きた|やめ|帰|消え)(?:ろ|れ|て|た)(?:！|$)/.test(text)) {
        return 'direct_criticism';
      }
    }

    return 'none';
  }

  /**
   * 人格攻撃・誹謗中傷の検出
   */
  private checkPersonalAttacks(text: string): DetectionResult {
    const attackType = this.analyzePersonalAttackPattern(text);
    
    if (attackType === 'moral_attack') {
      return { blocked: true, category: 'backseat' as Category, reason: '道徳的攻撃' };
    }
    
    if (attackType === 'character_assassination') {
      return { blocked: true, category: 'backseat' as Category, reason: '人格攻撃' };
    }
    
    if (attackType === 'relationship_shaming') {
      return { blocked: true, category: 'backseat' as Category, reason: '関係性批判' };
    }
    
    if (attackType === 'social_punishment') {
      return { blocked: true, category: 'backseat' as Category, reason: '社会的制裁' };
    }

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 人格攻撃パターンの分析
   */
  private analyzePersonalAttackPattern(text: string): 'moral_attack' | 'character_assassination' | 'relationship_shaming' | 'social_punishment' | 'none' {
    // 1. 道徳的攻撃パターン
    const moralAttackPatterns = [
      // スキャンダル関連の攻撃的言及
      /(?:不倫|浮気|裏切り|二股|W不倫).{0,30}(?:してた|した|相手|野郎|女|男|バレ|発覚)/,
      // 道徳観念による攻撃
      /(?:倫理|道徳|常識)(?:が|も)(?:ない|無い|欠けて|ゼロ|皆無)/,
      // 責任追及
      /(?:責任|けじめ)(?:を|も)(?:取れ|とれ|果たせ|はたせ)(?:よ|！|$)/,
      // 性的示唆・嘲笑
      /(?:やった|ばっこり|ムフフ|どんな声|この後).{0,15}(?:んです|ですか|んだろう|だろうな)？?/,
      // 嘲笑・茶化し
      /(?:ウケる|草|笑|w|ｗ).{0,20}(?:不倫|浮気|バレ|発覚|スキャンダル)/
    ];

    if (moralAttackPatterns.some(pattern => pattern.test(text))) {
      return 'moral_attack';
    }

    // 2. 人格否定攻撃パターン
    const characterAssassinationPatterns = [
      // 人格全否定
      /(?:人間として|人として|男として|女として).{0,15}(?:最低|クズ|終わって|ダメ|無理)/,
      // 存在価値否定
      /(?:生きてる|存在|いる)(?:価値|意味|資格)(?:が|も)(?:ない|無い|ゼロ)/,
      // 人格欠陥指摘
      /(?:性格|人格|本性|正体)(?:が|は).{0,10}(?:腐って|歪んで|最悪|ひどい|醜い)/,
      // 育ち・環境批判
      /(?:育ち|教育|親|環境)(?:が|も)(?:悪い|わるい|最悪|ダメ|問題)/
    ];

    if (characterAssassinationPatterns.some(pattern => pattern.test(text))) {
      return 'character_assassination';
    }

    // 3. 関係性恥辱攻撃パターン
    const relationshipShamingPatterns = [
      // 配偶者・恋人への同情煽り
      /(?:奥さん|旦那|嫁|妻|夫|彼女|彼氏)(?:が|も)(?:可哀想|かわいそう|気の毒)/,
      // 子供への影響言及
      /(?:子供|こども|子ども)(?:が|も|の)(?:可哀想|傷つく|トラウマ|影響)/,
      // 恋愛・結婚観批判
      /(?:結婚|恋愛|愛)(?:する|の)(?:資格|権利)(?:が|も)(?:ない|無い)/,
      // 嫌悪・拒絶表現
      /(?:うわぁ|もうむり|もう無理|見たくない|聞きたくない)(?:だ|です|。|！)/,
      // 関係推測・詮索
      /(?:そばに男|一緒に|２人で|2人で)(?:いる|行って|泊まって)(?:た|る)(?:んです|のか|と思う)？?/
    ];

    if (relationshipShamingPatterns.some(pattern => pattern.test(text))) {
      return 'relationship_shaming';
    }

    // 4. 社会的制裁要求パターン
    const socialPunishmentPatterns = [
      // 職業・地位剥奪要求
      /(?:仕事|職|地位|立場)(?:を|も)(?:辞めろ|やめろ|失え|うしなえ|奪われろ)/,
      // 社会復帰阻止
      /(?:二度と|もう)(?:表舞台|メディア|テレビ|配信)(?:に|には)(?:出るな|でるな|現れるな)/,
      // 制裁・報復予告
      /(?:報い|バチ|天罰|制裁)(?:が|を)(?:当たる|受ける|下る|食らう)/,
      // 追放・排除要求
      /(?:追放|排除|除名|永久追放)(?:しろ|されろ|すべき|すべきだ)/
    ];

    if (socialPunishmentPatterns.some(pattern => pattern.test(text))) {
      return 'social_punishment';
    }

    // 5. スキャンダル関連の単純言及（広範囲検出）
    const scandalMentions = [
      // スキャンダルキーワードの直接言及
      /(?:不倫|浮気|二股|W不倫)(?:してた|した|相手|してる|だ|です|でしょう|かよ|ですね)/,
      // スキャンダル + 場所・状況
      /(?:不倫|浮気|スキャンダル)(?:旅行|宿泊|ホテル|温泉|デート|現場|場所)/,
      // スキャンダル + 感情表現（距離拡張）
      /(?:不倫|浮気).{0,30}(?:😂|w|ｗ|草|笑|ウケる|うける)/,
      // スキャンダル + アドバイス・批判
      /(?:不倫|浮気).{0,20}(?:やめた方が|やめたほうが|ダメ|だめ|良くない|よくない)/,
      // 性的示唆（拡張版）
      /(?:この後|あの後|夜は|ベッドで|ここで)(?:やった|した|ムフフ|エッチ|セックス|ばっこり)/,
      // バレた・発覚系
      /(?:不倫|浮気)(?:が|も).{0,20}(?:バレ|ばれ|発覚|判明|露呈)/,
      // 金銭関係の示唆
      /(?:ホテル代|宿泊費|旅行代|お金)(?:を|も|は).{0,15}(?:出して|払って|もらった|くれた)/
    ];

    if (scandalMentions.some(pattern => pattern.test(text))) {
      return 'moral_attack';
    }

    // 6. 文脈判定（全体トーン分析）
    const overallTone = this.analyzeSentenceTone(text);
    if (overallTone === 'negative') {
      // 強い非難や攻撃的な語調の場合
      if (/(?:許さない|絶対|絶対に).{0,10}(?:だめ|ダメ|最低|クズ)/.test(text)) {
        return 'moral_attack';
      }
    }

    return 'none';
  }

  /**
   * ネガティブコメントの深刻度判定
   */
  private getNegativeSeverity(text: string): 'severe' | 'moderate' | 'mild' {
    const severeTerms = [
      // 直接攻撃・暴言
      '死ね', '消えろ', '黙れ', 'しね', 'きえろ', 'だまれ',
      
      // 人格攻撃
      'ゴミ', 'クズ', 'カス', 'ガイジ', 'キチガイ', '基地外',
      'バカ', 'ばか', 'アホ', 'あほ',
      
      // 外見攻撃
      'ブス', 'ブサイク', 'デブ', 'ハゲ',
      
      // 存在否定
      '帰れ', 'かえれ', '出て行け', '二度と来るな'
    ];

    const moderateTerms = [
      // 強い不満・嫌悪
      '最悪', 'さいあく', 'うざい', 'むかつく', 'きもい', 'きしょい',
      'イライラ', 'いらいら', '要らない', 'いらない', '邪魔',
      
      // 能力・内容否定
      '下手', 'へた', 'ヘタ', 'つまらない', 'つまらん', 'ひどい', '酷い',
      '飽きた', 'あきた', 'だめ', 'ダメ', '無理', 'むり',
      
      // 拒絶・嫌悪
      'やめろ', 'やめて', '嫌い', 'きらい', '見たくない', '聞きたくない',
      'やる気ない', 'やるきない'
    ];

    const targetedAttack = [
      'お前', 'おまえ', 'てめえ', 'てめぇ', 'こいつ', 'コイツ'
    ];

    const hasSevere = severeTerms.some(term => text.includes(term));
    const hasModerate = moderateTerms.some(term => text.includes(term));
    const hasTargeted = targetedAttack.some(term => text.includes(term));

    // 悪質判定
    if (hasSevere || (hasTargeted && (hasSevere || hasModerate))) {
      return 'severe';
    }

    // 中程度判定
    if (hasModerate) {
      return 'moderate';
    }

    return 'mild';
  }

  /**
   * 文章全体の意図・トーンを分析
   */
  private analyzeSentenceTone(text: string): 'positive' | 'negative' | 'factual' | 'opinion' | 'reaction' | 'neutral' {
    // ポジティブな感想・応援
    const positiveIndicators = [
      // 感動・賞賛
      'すごい', 'すげー', '素晴らしい', '最高', '神', '天才', '感動',
      'やばい', 'やべー', 'めっちゃ', 'とても', '本当に',
      
      // 好み・愛着
      '好き', '大好き', '推し', '魅力的', 'かっこいい', 'かわいい',
      
      // 楽しさ・満足
      '楽しい', '面白い', '嬉しい', '満足', 'いいね', '良い',
      
      // 応援・感謝
      'ありがとう', 'お疲れ', '頑張って', '応援', 'ファイト'
    ];

    // リアクション・感嘆
    const reactionIndicators = [
      'えええ', 'おおお', 'わあ', 'まじか', 'うそ', 'びっくり',
      'きた', 'キタ', 'やった', 'おー', 'わー', 'へー'
    ];

    // 感想・意見
    const opinionIndicators = [
      'と思う', 'と思った', '気がする', '感じ', '印象', '個人的に',
      'みたい', 'っぽい', 'らしい', 'でしょう', 'だろう'
    ];

    // 事実断定
    const factualIndicators = [
      'である', 'だった', 'になった', 'した', 'される', '確定', '判明',
      'ネタバレ', '結果', '真相', '正体', '犯人', '黒幕'
    ];

    // ネガティブ・攻撃的
    const negativeIndicators = [
      // 直接攻撃・暴言
      '死ね', '消えろ', '黙れ', 'しね', 'きえろ', 'だまれ',
      '最悪', 'さいあく', 'うざい', 'むかつく', 'イライラ', 'いらいら',
      
      // 人格攻撃
      'ゴミ', 'クズ', 'カス', 'ガイジ', 'バカ', 'ばか', 'アホ', 'あほ',
      'きもい', 'きしょい', 'ブス', 'ブサイク', 'デブ', 'ハゲ',
      
      // 否定・拒絶
      'つまらない', 'つまらん', '飽きた', 'あきた', 'やめろ', 'やめて',
      '帰れ', 'かえれ', '出て行け', '要らない', 'いらない', '邪魔',
      
      // 能力否定
      '下手', 'へた', 'ヘタ', 'だめ', 'ダメ', '無理', 'むり',
      
      // 強い不満
      'ひどい', '酷い', 'ウザ', 'ムカ', 'イラ', '嫌い', 'きらい',
      '見たくない', '聞きたくない', 'やる気ない', 'やるきない'
    ];

    const positiveCount = positiveIndicators.filter(term => text.includes(term)).length;
    const reactionCount = reactionIndicators.filter(term => text.includes(term)).length;
    const opinionCount = opinionIndicators.filter(term => text.includes(term)).length;
    const factualCount = factualIndicators.filter(term => text.includes(term)).length;
    const negativeCount = negativeIndicators.filter(term => text.includes(term)).length;

    // 感嘆符のパターンで判定補強
    const hasPositiveExclamation = /[!！]{1,2}$/.test(text) && positiveCount > 0;
    const hasReactionExclamation = /[!！？?]{1,3}/.test(text) && reactionCount > 0;

    // ネガティブ判定を厳格に
    if (negativeCount >= 1) return 'negative'; // 1つでもネガティブ語があればネガティブ
    if (positiveCount >= 2 || hasPositiveExclamation) return 'positive';
    if (reactionCount >= 1 || hasReactionExclamation) return 'reaction';
    if (opinionCount >= 1) return 'opinion';
    if (factualCount >= 1) return 'factual';
    
    return 'neutral';
  }

  /**
   * 悪意・攻撃性の検出
   */
  private hasHostility(text: string): boolean {
    const hostileTerms = [
      '死ね', '消えろ', '黙れ', 'うざい', 'きもい', 'むかつく',
      'ゴミ', 'クズ', 'カス', 'バカ', '馬鹿', 'アホ', 'あほ',
      '最悪', 'ブス', 'ブサイク', 'デブ', 'ハゲ',
      '許さない', '二度と来るな', '帰れ', '出て行け'
    ];

    const targetedAttack = [
      'お前', 'おまえ', 'てめえ', 'てめぇ', '@'
    ];

    const hasHostile = hostileTerms.some(term => text.includes(term));
    const hasTargeted = targetedAttack.some(term => text.includes(term));

    return hasHostile || (hasTargeted && hasHostile);
  }

  /**
   * 3.1 ネタバレ検出（命題性チェック）
   */
  private detectSpoiler(text: string, isLiveChat = false): DetectionResult {
    let score = 0;
    const reasons: string[] = [];

    // まず文章全体の意図を判定
    const overallTone = this.analyzeSentenceTone(text);
    
    // ポジティブ・応援・感想の文章はネタバレではない
    if (overallTone === 'positive' || overallTone === 'opinion' || overallTone === 'reaction') {
      return { blocked: false, category: null, reason: `${overallTone}文章` };
    }

    // A1. 断定的な事実の陳述パターン
    const factualPatterns = [
      /(.+)は(.+)だった$/, /(.+)は(.+)である$/, /(.+)は(.+)$/, 
      /(.+)が(.+)だった$/, /(.+)が(.+)である$/,
      /正体は(.+)/, /犯人は(.+)/, /黒幕は(.+)/, /真犯人は(.+)/,
      /結末は(.+)/, /最後は(.+)/, /エンディングは(.+)/
    ];
    
    const hasFactualPattern = factualPatterns.some(pattern => pattern.test(text));
    if (hasFactualPattern) {
      score += 3;
      reasons.push('事実断定');
    }

    // A2. 具体的事実の詳述パターン
    const specificSpoilerPatterns = [
      /\d{1,2}:\d{2}.*?(死|勝|負|裏切|正体|犯人|黒幕)/, // タイムスタンプ + 結果
      /(第|episode|ep)\s*\d+.*?(死|勝|負|裏切|正体|犯人|黒幕)/, // エピソード + 結果
      /実は.*?(だった|である|になる)/, // 「実は〜だった」
      /最後.*?(死|勝|負|裏切|結末)/, // 「最後〜」
      /ネタバレ.*?(死|勝|負|裏切|正体|犯人|黒幕)/ // 明示的ネタバレ
    ];
    
    const hasSpecificSpoiler = specificSpoilerPatterns.some(pattern => pattern.test(text));
    if (hasSpecificSpoiler) {
      score += 4;
      reasons.push('具体的ネタバレ');
    }

    // A3. 重大事実の断定
    const majorSpoilerTerms = ['死ぬ', '死んだ', '殺される', '裏切る', '裏切った', '正体', '犯人', '黒幕', '真犯人'];
    const hasMajorSpoiler = majorSpoilerTerms.some(term => text.includes(term));
    if (hasMajorSpoiler && overallTone === 'factual') {
      score += 2;
      reasons.push('重大事実');
    }

    // B) 確定性調整（減点）
    const uncertaintyTerms = [
      'かもしれない', 'かも', 'っぽい', '予想', '考察', 'たぶん', 'おそらく',
      'maybe', 'probably', 'might', 'could', 'じゃないかな', '気がする'
    ];
    let uncertaintyCount = 0;
    uncertaintyTerms.forEach(term => {
      if (text.includes(term)) uncertaintyCount++;
    });
    score -= uncertaintyCount;
    if (uncertaintyCount > 0) {
      reasons.push(`推量表現-${uncertaintyCount}`);
    }

    // C) ネタ・ジョーク文脈での減点
    const jokeIndicators = [
      'ネタ', 'ギャグ', 'ボケ', 'ツッコミ', 'コント', 'お笑い',
      'ジョーク', 'joke', 'meme', 'ミーム',
      'だと思った', 'と思ったら', 'のはず', 'に違いない',
      '絶対', '間違いない', '確実に'  // 過度な確信表現（ネタっぽい）
    ];
    const hasJokeContext = jokeIndicators.some(term => text.includes(term));
    if (hasJokeContext) {
      score -= 2;
      reasons.push('ネタ文脈');
    }

    // D) 感情的な表現での減点（ネタ・リアクション）
    const emotionalReactions = [
      'えええ', 'ええええ', 'まじか', 'マジか', 'うそでしょ', 'うそ！',
      'びっくり', 'ビックリ', 'おどろいた', '驚いた'
    ];
    const hasEmotionalReaction = emotionalReactions.some(term => text.includes(term));
    if (hasEmotionalReaction && !this.hasHostility(text)) {
      score -= 1;
      reasons.push('感情的リアクション');
    }

    // 否定チェック
    const negationTerms = ['ネタバレしない', 'ネタバレなし', 'ネタバレ禁止', 'ネタバレ注意なし'];
    const hasNegation = negationTerms.some(term => text.includes(term));
    if (hasNegation) {
      return { blocked: false, category: null, reason: 'ネタバレ否定' };
    }

    // 引用・例示チェック
    if (text.includes('「') && text.includes('」')) {
      score -= 1;
      reasons.push('引用可能性');
    }

    // スコア判定（ライブチャットとアーカイブで異なる閾値）
    const threshold = isLiveChat ? 6 : 5; // ライブ中はより厳格に
    
    if (score >= threshold) {
      return { blocked: true, category: 'spoiler' as Category, reason: reasons.join(', ') };
    }
    
    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 3.2 匂わせ検出
   */
  private detectHint(text: string): DetectionResult {
    const directHintTerms = [
      'このあと', '次が', '来るぞ', 'くるぞ', 'ここが伏線', '準備して',
      '確定', '確実', 'ほぼ確', '情報筋', 'リーク', '確報'
    ];

    const impliedTerms = [
      '某', 'イニシャル', '◯◯', '○○', '〇〇', 'あの人', '例の人',
      '内部情報', '関係者', '先行情報'
    ];

    const timeTerms = ['次回', '来週', '今夜', 'この後', '今度', '後で', '明日', '今後'];

    // 直接示唆チェック
    const directHintFound = directHintTerms.some(term => text.includes(term));
    if (directHintFound) {
      return { blocked: true, category: 'hint' as Category, reason: '直接示唆' };
    }

    // 伏せ字 + 時系列語の組み合わせ
    const impliedFound = impliedTerms.some(term => text.includes(term));
    if (impliedFound) {
      const hasTimeRef = timeTerms.some(term => text.includes(term));
      if (hasTimeRef) {
        return { blocked: true, category: 'hint' as Category, reason: '伏せ字+時系列' };
      }
      
      // カタカナ固有名詞との組み合わせ
      if (/[ア-ヴ]{3,}/.test(text)) {
        return { blocked: true, category: 'hint' as Category, reason: '伏せ字+固有名詞' };
      }
    }

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 3.3 鳩行為検出
   */
  private detectHato(text: string): DetectionResult {
    // 他枠参照
    const otherStreamRefs = [
      '他の枠', '向こうの配信', 'あっちの配信', '別の配信', '他の配信者',
      '他のチャンネル', 'あのチャンネル', '他の人', '別のVtuber', '他のV'
    ];
    
    const hasOtherStreamRef = otherStreamRefs.some(ref => text.includes(ref));
    
    // 伝達動詞
    const communicationVerbs = [
      '言ってた', '言ってる', '話してた', '話してる', '伝えて', '報告して',
      'から来た', 'で見た', 'で聞いた', 'って言ってた', 'でやってた',
      '教えて', '知らせて', '共有して'
    ];
    
    const hasCommunicationVerb = communicationVerbs.some(verb => text.includes(verb));
    
    if (hasOtherStreamRef && hasCommunicationVerb) {
      return { blocked: true, category: 'hato' as Category, reason: '他枠参照+伝達動詞' };
    }
    
    // 配信者名の直接言及パターン
    if (text.includes('○○が') && hasCommunicationVerb) {
      return { blocked: true, category: 'hato' as Category, reason: '配信者言及+伝達' };
    }
    
    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 3.4 指示厨検出
   */
  private detectBackseat(text: string, author: string): DetectionResult {
    // 命令表現
    const commandPatterns = [
      /(.+)しろ$/, /(.+)して$/, /(.+)しな$/, /(.+)ろ$/,
      /^(.+)しろ/, /^(.+)して/, /^(.+)しな/, /^(.+)ろ/,
      /やれ/, /いけ/, /行け/, /進め/, /戻れ/
    ];
    
    const hasCommand = commandPatterns.some(pattern => pattern.test(text));
    
    // 操作/攻略語彙
    const gameplayTerms = [
      '進め', '戻れ', 'ジャンプ', '回避', '装備', '倒せ', '買え', '売れ',
      '地図見ろ', 'マップ', 'アイテム', 'スキル', 'レベル上げ', 'セーブ',
      'ロード', '設定', 'オプション', 'メニュー', 'インベントリ'
    ];
    
    const hasGameplayTerm = gameplayTerms.some(term => text.includes(term));
    
    // 強い命令語（単独でもアウト）
    const strongCommands = [
      'やれよ', 'しろよ', '早くしろ', 'さっさと', 'いい加減'
    ];
    const hasStrongCommand = strongCommands.some(cmd => text.includes(cmd));
    
    if (hasStrongCommand) {
      return { blocked: true, category: 'backseat' as Category, reason: '強い命令表現' };
    }
    
    if (hasCommand && hasGameplayTerm) {
      // 連投チェック
      const messageKey = this.createHash(text);
      const now = Date.now();
      const recent = this.recentMessages.get(`${author}:${messageKey}`);
      
      if (recent && (now - recent.timestamp) < 30000) {
        recent.count++;
        if (recent.count >= 2) {
          return { blocked: true, category: 'backseat' as Category, reason: '命令+操作語+連投' };
        }
      } else {
        this.recentMessages.set(`${author}:${messageKey}`, { timestamp: now, count: 1 });
      }
      
      return { blocked: true, category: 'backseat' as Category, reason: '命令+操作語' };
    }
    
    // 例外：質問形式
    if (/どうやって|どうしたら|どうすれば|？|どこ|なぜ|なんで/.test(text)) {
      return { blocked: false, category: null, reason: '質問形式' };
    }
    
    // 例外：丁寧表現
    if (/お疲れ|ありがと|すごい|上手|頑張って/.test(text)) {
      return { blocked: false, category: null, reason: '丁寧表現' };
    }

    // 例外：ネタ・ジョーク文脈
    if (this.isJokeComment(text) && !this.hasHostility(text)) {
      return { blocked: false, category: null, reason: 'ネタ文脈' };
    }
    
    return { blocked: false, category: null, reason: '' };
  }

  private createHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private checkAndReset(): void {
    const now = Date.now();
    if (now - this.lastReset > 60000) { // 60秒でリセット
      this.recentMessages.clear();
      this.negativeHistory.clear();
      this.lastReset = now;
    }
  }

  isProcessed(element: HTMLElement): boolean {
    return this.processedComments.has(element);
  }

  markProcessed(element: HTMLElement): void {
    this.processedComments.add(element);
  }

  reset(): void {
    this.recentMessages.clear();
    this.negativeHistory.clear();
    this.lastReset = Date.now();
    this.processedComments = new WeakSet<HTMLElement>();
  }
}

export const unifiedDetector = new UnifiedCommentDetector();