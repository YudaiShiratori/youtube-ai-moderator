import { DetectionResult, Category } from '../types';

/**
 * YouTube AI Moderator v6 - 新仕様による厳格検出ロジック
 * 文の意味による判定：spoiler, hint, hato, backseat
 */

class NewLiveChatDetector {
  private processedComments = new WeakSet<HTMLElement>();
  private recentMessages = new Map<string, { timestamp: number; count: number }>();
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
  detect(text: string, author: string): DetectionResult {
    this.checkAndReset();
    
    const normalized = this.normalizeText(text);
    
    // 笑い単独は通す
    if (/^[wｗw草笑]*$/.test(normalized.replace(/[\s\u3000]/g, ''))) {
      return { blocked: false, category: null, reason: '' };
    }

    // 1. ネタバレ検出（最重要）
    const spoilerResult = this.detectSpoiler(normalized);
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
   * 3.1 ネタバレ検出（命題性チェック）
   */
  private detectSpoiler(text: string): DetectionResult {
    let score = 0;
    const reasons: string[] = [];

    // A1. 対象の特定 (+2)
    const targets = [
      '主人公', '師匠', 'ボス', 'ラスボス', '犯人', '黒幕', '正体', 
      'キャラ', 'チーム', '敵', '味方', 'プレイヤー'
    ];
    const targetFound = targets.some(target => text.includes(target));
    if (targetFound) {
      score += 2;
      reasons.push('対象特定');
    }

    // 固有名詞パターン（カタカナ3文字以上）
    if (/[ア-ヴ]{3,}/.test(text)) {
      score += 2;
      reasons.push('固有名詞');
    }

    // A2. 出来事の明示 (+2)
    const events = [
      '死ぬ', '死んだ', '死亡', '殺される', '裏切る', '裏切った',
      '勝つ', '負ける', '優勝', '敗北', '復活', '登場', '離脱',
      'クリア', 'ゲームオーバー', '倒す', '倒した', '攻略'
    ];
    const eventFound = events.some(event => text.includes(event));
    if (eventFound) {
      score += 2;
      reasons.push('事象明示');
    }

    // 英語の出来事
    const englishEvents = ['dies', 'death', 'killed', 'betrays', 'wins', 'loses'];
    const englishEventFound = englishEvents.some(event => text.includes(event));
    if (englishEventFound) {
      score += 2;
      reasons.push('英語事象');
    }

    // A3. 関係/同一性の明示 (+2)
    const identityPatterns = [
      /(.+)は(.+)/, /(.+)が(.+)/, /(.+)＝(.+)/, 
      /正体は/, /犯人は/, /黒幕は/, /ラスボスは/
    ];
    const identityFound = identityPatterns.some(pattern => pattern.test(text));
    if (identityFound) {
      score += 3; // 同一性は重要なので+3
      reasons.push('同一性命題');
    }

    // A4. 時点の特定 (+1)
    const timePatterns = [
      /\d{1,2}:\d{2}/, /第\d+話/, /\d+章/, /\d+面/, /ステージ\d+/,
      /episode\s*\d+/i, /ep\s*\d+/i, /s\d+e\d+/i
    ];
    const timeFound = timePatterns.some(pattern => pattern.test(text));
    if (timeFound) {
      score += 1;
      reasons.push('時点特定');
    }

    // A5. 情報源の確度 (+1)
    const certaintyTerms = ['確定', '公式', '確実', 'ネタバレ注意', '確認済み'];
    const certaintyFound = certaintyTerms.some(term => text.includes(term));
    if (certaintyFound) {
      score += 1;
      reasons.push('高確度');
    }

    // B) 確定性調整（減点）
    const uncertaintyTerms = ['かもしれない', 'かも', 'っぽい', '予想', '考察', 'たぶん', 'maybe', 'probably'];
    let uncertaintyCount = 0;
    uncertaintyTerms.forEach(term => {
      if (text.includes(term)) uncertaintyCount++;
    });
    score -= uncertaintyCount;
    if (uncertaintyCount > 0) {
      reasons.push(`推量表現-${uncertaintyCount}`);
    }

    // 否定チェック
    const negationTerms = ['ネタバレしない', 'ネタバレなし', 'ネタバレ禁止'];
    const hasNegation = negationTerms.some(term => text.includes(term));
    if (hasNegation) {
      return { blocked: false, category: null, reason: 'ネタバレ否定' };
    }

    // スコア判定
    if (score >= 5) {
      return { blocked: true, category: 'spoiler' as Category, reason: reasons.join(', ') };
    }
    
    return { blocked: false, category: null, reason: '' };
  }

  /**
   * 3.2 匂わせ検出
   */
  private detectHint(text: string): DetectionResult {
    const hintTerms = [
      'このあと', '次が', '来るぞ', 'くるぞ', 'ここが伏線', '準備して',
      '某', 'イニシャル', '◯◯', '○○', '〇〇', 'あの人', '例の人',
      '情報筋', 'リーク', '確報', '内部情報', '関係者'
    ];

    const hintFound = hintTerms.some(term => text.includes(term));
    if (hintFound) {
      // 時系列語との組み合わせチェック
      const timeTerms = ['次回', '来週', '今夜', 'この後', '今度', '後で'];
      const hasTimeRef = timeTerms.some(term => text.includes(term));
      
      if (hasTimeRef) {
        return { blocked: true, category: 'hint' as Category, reason: '匂わせ+時系列' };
      }
      
      // 単独でも保留レベル
      return { blocked: true, category: 'hint' as Category, reason: '匂わせ表現' };
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
      '他のチャンネル', 'あのチャンネル'
    ];
    
    const hasOtherStreamRef = otherStreamRefs.some(ref => text.includes(ref));
    
    // 伝達動詞
    const communicationVerbs = [
      '言ってた', '言ってる', '話してた', '話してる', '伝えて', '報告して',
      'から来た', 'で見た', 'で聞いた', 'って言ってた'
    ];
    
    const hasCommunicationVerb = communicationVerbs.some(verb => text.includes(verb));
    
    if (hasOtherStreamRef && hasCommunicationVerb) {
      return { blocked: true, category: 'hato' as Category, reason: '他枠参照+伝達動詞' };
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
      /^(.+)しろ/, /^(.+)して/, /^(.+)しな/, /^(.+)ろ/
    ];
    
    const hasCommand = commandPatterns.some(pattern => pattern.test(text));
    
    // 操作/攻略語彙
    const gameplayTerms = [
      '進め', '戻れ', 'ジャンプ', '回避', '装備', '倒せ', '買え', '売れ',
      '地図見ろ', 'マップ', 'アイテム', 'スキル', 'レベル上げ', 'セーブ'
    ];
    
    const hasGameplayTerm = gameplayTerms.some(term => text.includes(term));
    
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
    if (/どうやって|どうしたら|？/.test(text)) {
      return { blocked: false, category: null, reason: '質問形式' };
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
    this.lastReset = Date.now();
  }
}

export const liveChatDetector = new NewLiveChatDetector();