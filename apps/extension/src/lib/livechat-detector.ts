import { DetectionResult } from '../types';

/**
 * YouTube AI Moderator v5 - ライブチャット専用厳格検出ロジック
 * 1ヒット即ブロック、草/w/ｗ単独は常に許可
 */

class LiveChatStrictDetector {
  private processedComments = new WeakSet<HTMLElement>();
  private authorCounts = new Map<string, Map<string, number>>();
  private urlCounts = new Map<string, number>();
  private lastReset = Date.now();

  /**
   * A. 強化された正規化と難読化解除
   */
  private normalizeText(text: string): string {
    // 1. Unicode NFKC正規化
    let normalized = text.normalize('NFKC');
    
    // 2. ゼロ幅・方向制御文字削除
    normalized = normalized.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
    
    // 3. confusables/リート置換フォールド（強化版）
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
      // リート文字
      '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't',
      // 装飾文字
      'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e',
      'ⓕ': 'f', 'ⓖ': 'g', 'ⓗ': 'h', 'ⓘ': 'i', 'ⓙ': 'j',
      // カタカナ（一部）
      'テ': 'て', 'レ': 'れ', 'グ': 'ぐ', 'ラ': 'ら', 'ム': 'む',
    };
    
    for (const [from, to] of Object.entries(charMap)) {
      normalized = normalized.replace(new RegExp(from, 'gi'), to);
    }
    
    return normalized.toLowerCase();
  }

  /**
   * 4. 強化された骨格（skeleton）抽出
   * 語中の中点・記号・絵文字・スペース・ドット・ゼロ幅を最大2連まで無視して連結
   * 例: "t.e-l e g r a m" → "telegram"
   */
  private extractSkeleton(text: string): string {
    // スペース/記号/絵文字/中点等を削除して骨格抽出（強化版）
    return text.replace(/[\s\-_\.\u30FB\u2022\u2023\u25CF\u25CB\u25A0\u25A1\u00B7\u2027]{1,2}/g, '')
               .replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}]{1,2}/gu, '');
  }

  /**
   * 5. 強化された長音/笑い処理
   */
  private compressRepeats(text: string): string {
    // 長音圧縮
    text = text.replace(/ー{2,}/g, 'ー');
    text = text.replace(/[——]{2,}/g, '——');
    
    // 笑い文字は単独なら無視フラグを付ける（強化版）
    if (/^[wｗ草笑ｗw]*$/.test(text.replace(/[\s\u3000]/g, ''))) {
      return ''; // 笑いのみは空にして除外
    }
    
    return text;
  }

  /**
   * B. 1ヒット即ブロックの厳格判定（ライブチャット専用）
   */
  detect(text: string, author: string): DetectionResult {
    this.checkAndReset();
    
    // 正規化処理
    const original = text;
    const normalized = this.normalizeText(text);
    const compressed = this.compressRepeats(normalized);
    const skeleton = this.extractSkeleton(compressed);
    
    // 笑いのみは通す
    if (!compressed) {
      return { blocked: false, category: null, reason: '' };
    }

    // 1. 直接攻撃（Harassment-Directed）
    const harassmentResult = this.checkDirectHarassment(normalized, skeleton);
    if (harassmentResult.blocked) return harassmentResult;

    // 2. 露骨なネタバレ（Spoiler-Concrete）
    const spoilerResult = this.checkConcreteSpoiler(normalized, skeleton);
    if (spoilerResult.blocked) return spoilerResult;

    // 3. 勧誘・連絡誘導・短縮URL（Recruiting-Link）
    const recruitingResult = this.checkRecruiting(normalized, skeleton, original);
    if (recruitingResult.blocked) return recruitingResult;

    // 4. 連投スパム（Repeat-Spam）
    const repeatResult = this.checkRepeatSpam(skeleton, author, original);
    if (repeatResult.blocked) return repeatResult;

    // 5. なりすまし（Impersonation-Official）
    const impersonationResult = this.checkImpersonation(normalized, skeleton);
    if (impersonationResult.blocked) return impersonationResult;

    // 6. 絵文字壁・ノイズ（Emoji/Noise Wall）
    const noiseResult = this.checkNoise(original, normalized);
    if (noiseResult.blocked) return noiseResult;

    // 7. 匂わせ（Hints）- ライブ用新規追加
    const hintResult = this.checkHints(normalized, skeleton);
    if (hintResult.blocked) return hintResult;

    // 8. 語気強（Strong Tone）- ライブ用新規追加
    const strongToneResult = this.checkStrongTone(normalized, original);
    if (strongToneResult.blocked) return strongToneResult;

    return { blocked: false, category: null, reason: '' };
  }

  private checkDirectHarassment(normalized: string, _skeleton: string): DetectionResult {
    const insults = [
      '死ね', '消えろ', '黙れ', 'ゴミ', 'クズ', '最悪', '頭おかし', 'きもい', 'きしょい',
      'うざい', 'むかつく', 'ブス', 'ブサイク', 'デブ', 'ハゲ', '馬鹿', 'バカ', 'あほ',
      'アホ', 'カス', 'しね', 'きえろ', 'だまれ'
    ];
    
    const targets = [
      'お前', 'おまえ', 'てめえ', 'てめぇ', 'お前ら', 'おまえら', '配信者', '実況者',
      '管理人', '運営', '@', 'you ', 'your '
    ];
    
    const commands = [
      'しろ', 'やれ', '謝れ', '責任取れ', '二度と来るな', '許さない', '出て', '帰れ'
    ];

    // 侮辱語 ∧ 対象指示
    for (const insult of insults) {
      if (normalized.includes(insult)) {
        for (const target of targets) {
          if (normalized.includes(target)) {
            return { blocked: true, category: 'harassment', reason: `侮辱語「${insult}」+ 対象指示「${target}」` };
          }
        }
      }
    }

    // 侮辱語 ∧ 命令/断定
    for (const insult of insults) {
      if (normalized.includes(insult)) {
        for (const command of commands) {
          if (normalized.includes(command)) {
            return { blocked: true, category: 'harassment', reason: `侮辱語「${insult}」+ 命令「${command}」` };
          }
        }
      }
    }

    // 危害の示唆
    const threats = ['ぶっころ', 'ぶっ殺', '殺す', 'kill you', 'murder'];
    for (const threat of threats) {
      if (normalized.includes(threat)) {
        return { blocked: true, category: 'harassment', reason: `危害示唆「${threat}」` };
      }
    }

    return { blocked: false, category: null, reason: '' };
  }

  private checkConcreteSpoiler(normalized: string, _skeleton: string): DetectionResult {
    const coreTerms = [
      '犯人', '黒幕', '正体', '死亡', '死ぬ', '死んだ', '最終回', '結末', '真相', 
      'ラスボス', 'ネタバレ', 'ending', 'finale', 'spoiler', 'dies', 'death'
    ];
    
    const specificTerms = /第\d+話|S\d+E\d+|EP\d+|\d{1,2}:\d{2}/i;
    
    // 核心語の単独での断定表現（安心最優先）
    const directSpoilers = ['犯人は', '黒幕は', '死ぬ', '死んだ', 'dies'];
    for (const spoiler of directSpoilers) {
      if (normalized.includes(spoiler)) {
        return { blocked: true, category: 'spoiler', reason: `直接ネタバレ「${spoiler}」` };
      }
    }

    // 核心語 ∧ 具体性
    for (const core of coreTerms) {
      if (normalized.includes(core)) {
        if (specificTerms.test(normalized)) {
          return { blocked: true, category: 'spoiler', reason: `具体的ネタバレ「${core}」+ 具体性` };
        }
      }
    }

    return { blocked: false, category: null, reason: '' };
  }

  private checkRecruiting(normalized: string, skeleton: string, original: string): DetectionResult {
    const cta = [
      'クリック', '登録', '連絡', 'dm', 'contact', 'text me', '見て', 'みて', 'check'
    ];
    
    const services = [
      'telegram', 'whatsapp', 'discord', 'line', '@', 'gmail', 'yahoo', 'hotmail'
    ];
    
    const moneyTerms = [
      '副業', '高収入', '日給', '投資', '稼げ', '儲かる', 'money', 'earn', 'profit'
    ];

    // CTA ∧ 連絡先/サービス
    for (const c of cta) {
      if (normalized.includes(c)) {
        for (const service of services) {
          if (normalized.includes(service) || skeleton.includes(service)) {
            return { blocked: true, category: 'recruiting', reason: `CTA「${c}」+ サービス「${service}」` };
          }
        }
      }
    }

    // URL数をカウント
    const urlMatches = original.match(/https?:\/\/[^\s]+/g) || [];
    if (urlMatches.length >= 2) {
      return { blocked: true, category: 'recruiting', reason: `複数URL（${urlMatches.length}本）` };
    }

    // 短縮/誘導ドメイン
    const shortDomains = /bit\.ly|linktr\.ee|tinyurl\.com|t\.co|lin\.ee|t\.me/i;
    if (shortDomains.test(original)) {
      for (const cword of [...cta, ...moneyTerms]) {
        if (normalized.includes(cword)) {
          return { blocked: true, category: 'recruiting', reason: `短縮URL + 勧誘語「${cword}」` };
        }
      }
    }

    // 変形URL検出
    const obfuscatedUrls = ['hxxps', 't[.]me', 'lin[.]ee', 'd i s c o r d', 'ｗｈａｔｓａｐｐ'];
    for (const obf of obfuscatedUrls) {
      if (skeleton.includes(obf.replace(/[\[\]\s\.]/g, ''))) {
        return { blocked: true, category: 'recruiting', reason: `変形URL「${obf}」` };
      }
    }

    return { blocked: false, category: null, reason: '' };
  }

  private checkRepeatSpam(skeleton: string, author: string, original: string): DetectionResult {
    const textHash = this.createHash(skeleton);
    
    // 著者の投稿履歴を取得/初期化
    if (!this.authorCounts.has(author)) {
      this.authorCounts.set(author, new Map());
    }
    const authorTexts = this.authorCounts.get(author)!;
    
    // 同一/類似本文のカウント
    const currentCount = authorTexts.get(textHash) || 0;
    authorTexts.set(textHash, currentCount + 1);
    
    if (currentCount >= 1) { // 2回目以降
      return { blocked: true, category: 'repeat', reason: `同一内容の再投稿（${currentCount + 1}回目）` };
    }

    // URL再投稿チェック
    const urls = original.match(/https?:\/\/[^\s]+/g) || [];
    for (const url of urls) {
      const urlCount = this.urlCounts.get(url) || 0;
      this.urlCounts.set(url, urlCount + 1);
      if (urlCount >= 1) {
        return { blocked: true, category: 'repeat', reason: `同一URL再投稿` };
      }
    }

    // チェーン誘導
    const chainTerms = ['このコメントをコピペ', 'コピペして', '拡散希望', '拡散して'];
    for (const chain of chainTerms) {
      if (skeleton.includes(chain.replace(/\s/g, ''))) {
        return { blocked: true, category: 'repeat', reason: `チェーン誘導「${chain}」` };
      }
    }

    return { blocked: false, category: null, reason: '' };
  }

  private checkImpersonation(normalized: string, _skeleton: string): DetectionResult {
    const officialTerms = ['公式', '運営', 'サポート', 'official', 'support', '管理者'];
    const contactTerms = ['連絡', 'line', 'discord', 'メール', 'dm', 'contact'];
    
    for (const official of officialTerms) {
      if (normalized.includes(official)) {
        // 近傍12文字以内での連絡誘導チェック
        const officialIndex = normalized.indexOf(official);
        const nearbyText = normalized.substring(
          Math.max(0, officialIndex - 12), 
          officialIndex + official.length + 12
        );
        
        for (const contact of contactTerms) {
          if (nearbyText.includes(contact)) {
            return { blocked: true, category: 'impersonation', reason: `なりすまし「${official}」+ 連絡誘導` };
          }
        }
      }
    }

    return { blocked: false, category: null, reason: '' };
  }

  private checkNoise(original: string, _normalized: string): DetectionResult {
    // 絵文字のカウント
    const emojiCount = (original.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
    const totalLength = original.length;
    
    if (emojiCount >= 7) {
      return { blocked: true, category: 'noise', reason: `絵文字壁（${emojiCount}個）` };
    }
    
    if (totalLength > 0 && (emojiCount / totalLength) > 0.8) {
      return { blocked: true, category: 'noise', reason: `絵文字率80%超（${emojiCount}/${totalLength}）` };
    }

    // 長音/記号/大文字の極端な壁
    if (/ー{12,}/.test(original)) {
      return { blocked: true, category: 'noise', reason: '長音壁' };
    }
    
    if (/[!！?？]{10,}/.test(original)) {
      return { blocked: true, category: 'noise', reason: '記号壁' };
    }
    
    if (/[A-Z]{12,}/.test(original)) {
      return { blocked: true, category: 'noise', reason: '大文字壁' };
    }

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 新規: 匂わせ（Hints）検出 - ライブチャット専用
   */
  private checkHints(normalized: string, _skeleton: string): DetectionResult {
    // パターン群A（直接示唆）
    const directHintTerms = [
      'く、くる', 'くるぞ', '来るぞ', '来るらしい', '来週くる', '次回くる',
      '確定', '確実', 'ほぼ確', '情報筋', 'リーク', '確報'
    ];
    
    // パターン群B（伏せ字・仄めかし）
    const impliedTerms = [
      '某', 'イニシャル', '◯◯', '○○', '〇〇', '※名前は伏せる', 'あの人', '例の人'
    ];
    
    // 時系列語
    const timeTerms = ['次回', '来週', '今夜', 'この後', '今度', '後で'];
    
    // 固有名/役名らしき連続カタカナ3文字以上
    const katakanaPattern = /[ア-ヴ]{3,}/;

    // パターン群A（直接示唆）の単独チェック
    for (const hint of directHintTerms) {
      if (normalized.includes(hint)) {
        return { blocked: true, category: 'hint', reason: `直接示唆「${hint}」` };
      }
    }

    // パターン群B（伏せ字・仄めかし）+ 併存条件チェック
    for (const implied of impliedTerms) {
      if (normalized.includes(implied)) {
        // 固有名らしきカタカナ または 時系列語 の併存チェック
        if (katakanaPattern.test(normalized)) {
          return { blocked: true, category: 'hint', reason: `伏せ字「${implied}」+ カタカナ固有名` };
        }
        for (const time of timeTerms) {
          if (normalized.includes(time)) {
            return { blocked: true, category: 'hint', reason: `伏せ字「${implied}」+ 時系列「${time}」` };
          }
        }
      }
    }

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 新規: 語気強（Strong Tone）検出 - ライブチャット専用
   */
  private checkStrongTone(normalized: string, original: string): DetectionResult {
    // 1. 命令/断定語
    const commandTerms = [
      'しろ', 'やれ', '黙れ', '謝れ', '責任取れ', '許さない', '二度と来るな'
    ];
    
    for (const command of commandTerms) {
      if (normalized.includes(command)) {
        return { blocked: true, category: 'strongTone', reason: `強い命令「${command}」` };
      }
    }

    // 2. 記号の壁
    if (/[!！?？]{6,}/.test(original)) {
      return { blocked: true, category: 'strongTone', reason: '記号壁（感嘆符・疑問符）' };
    }
    
    if (/ー{12,}/.test(original)) {
      return { blocked: true, category: 'strongTone', reason: '長音壁' };
    }
    
    if (/[A-Z]{12,}/.test(original)) {
      return { blocked: true, category: 'strongTone', reason: '大文字壁' };
    }

    // 3. 絵文字壁（7個以上 または 80%以上）
    const emojiCount = (original.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
    const totalLength = original.length;
    
    if (emojiCount >= 7) {
      return { blocked: true, category: 'strongTone', reason: `絵文字壁（${emojiCount}個）` };
    }
    
    if (totalLength > 0 && (emojiCount / totalLength) > 0.8) {
      return { blocked: true, category: 'strongTone', reason: `絵文字率80%超（${emojiCount}/${totalLength}）` };
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
      this.authorCounts.clear();
      this.urlCounts.clear();
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
    this.authorCounts.clear();
    this.urlCounts.clear();
    this.lastReset = Date.now();
  }
}

export const liveChatDetector = new LiveChatStrictDetector();