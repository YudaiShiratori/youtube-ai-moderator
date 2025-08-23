import { DetectionResult, Category } from '../types';

/**
 * 特別枠検出ロジック - 不倫関連
 * 独立したモジュールとして分離管理
 */
export class SpecialCategoryDetector {
  /**
   * 特別カテゴリの検出メインエントリーポイント
   */
  detect(text: string, author: string): DetectionResult {
    const normalized = this.normalizeText(text);
    
    // 不倫関連の検出
    const scandalResult = this.detectScandalContent(normalized);
    if (scandalResult.blocked) return scandalResult;

    return { blocked: false, category: null, reason: '' };
  }

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
   * 不倫・スキャンダル関連の検出
   */
  private detectScandalContent(text: string): DetectionResult {
    const scandalType = this.analyzeScandalPattern(text);
    
    if (scandalType === 'moral_attack') {
      return { blocked: true, category: 'backseat' as Category, reason: '道徳的攻撃' };
    }
    
    if (scandalType === 'relationship_shaming') {
      return { blocked: true, category: 'backseat' as Category, reason: '関係性批判' };
    }
    
    if (scandalType === 'social_punishment') {
      return { blocked: true, category: 'backseat' as Category, reason: '社会的制裁' };
    }

    return { blocked: false, category: null, reason: '' };
  }

  /**
   * スキャンダル関連パターンの分析
   */
  private analyzeScandalPattern(text: string): 'moral_attack' | 'relationship_shaming' | 'social_punishment' | 'none' {
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

    // 2. 関係性恥辱攻撃パターン
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

    // 3. 社会的制裁要求パターン
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

    // 4. スキャンダル関連の単純言及（広範囲検出）
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

    return 'none';
  }
}

export const specialDetector = new SpecialCategoryDetector();