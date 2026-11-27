// Upgrade cards offered in the shop between waves.
// rarity: 1 common, 2 rare, 3 epic.  max: purchase cap.  req: only offered when true.
const SKILLS = [
  // --- survival
  { id: 'maxhp', icon: 'heart', name: '강철 심장', desc: '최대 체력이 15 늘어납니다.', cost: 30, rarity: 1, max: 6,
    apply: s => { s.maxHp += 15; s.hp += 15; } },
  { id: 'heal', icon: 'potion', name: '회복 물약', desc: '체력을 50% 회복합니다.', cost: 15, rarity: 1,
    req: s => s.hp < s.maxHp, apply: s => { s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.5)); } },
  { id: 'miss', icon: 'shield', name: '그림자 망토', desc: '적의 공격을 12% 확률로 피합니다.', cost: 30, rarity: 2, max: 4,
    apply: s => { s.miss += 0.12; } },
  { id: 'armor', icon: 'armor', name: '강철 방패', desc: '받는 피해가 1 줄어듭니다.', cost: 35, rarity: 2, max: 3,
    apply: s => { s.armor += 1; } },
  { id: 'regen', icon: 'regen', name: '재생', desc: '전투 중 4초마다 체력이 1 회복됩니다.', cost: 25, rarity: 1, max: 3,
    apply: s => { s.regen += 1; } },
  { id: 'thorns', icon: 'thorns', name: '가시 갑옷', desc: '공격한 적에게 그 적 최대 체력의 25%만큼 되돌려줍니다.', cost: 25, rarity: 1, max: 3,
    apply: s => { s.thorns += 1; } },
  { id: 'lifesteal', icon: 'drop', name: '흡혈', desc: '적을 처치하면 15% 확률로 체력이 1 회복됩니다.', cost: 30, rarity: 2, max: 3,
    apply: s => { s.lifesteal += 1; } },
  { id: 'revive', icon: 'feather', name: '불사조 깃털', desc: '쓰러지면 한 번, 체력 50%로 되살아납니다.', cost: 80, rarity: 3, max: 1,
    apply: s => { s.revive += 1; } },

  // --- damage
  { id: 'atk', icon: 'sword', name: '날카로운 화살촉', desc: '공격력이 25% 오릅니다.', cost: 25, rarity: 1, max: 8,
    apply: s => { s.atkMul += 0.25; } },
  { id: 'rage', icon: 'rage', name: '분노', desc: '다음 웨이브 동안 공격력이 200% 오릅니다.', cost: 20, rarity: 2,
    apply: s => { s.tempAtkNext = 3; } },
  { id: 'crit', icon: 'star', name: '급소 사격', desc: '치명타 확률이 10% 오릅니다.', cost: 25, rarity: 2, max: 5,
    apply: s => { s.crit += 0.1; } },
  { id: 'critDmg', icon: 'critDmg', name: '치명적 일격', desc: '치명타 피해가 100% 늘어납니다.', cost: 35, rarity: 2, max: 3,
    req: s => s.crit > 0, apply: s => { s.critMul += 1; } },
  { id: 'fire', icon: 'arrow', name: '연사', desc: '발사 속도가 30% 빨라집니다.', cost: 20, rarity: 1, max: 6,
    apply: s => { s.fireMul += 0.3; } },
  { id: 'pierce', icon: 'arrow2', name: '관통 화살', desc: '화살이 적을 하나 더 꿰뚫습니다.', cost: 45, rarity: 3, max: 3,
    apply: s => { s.pierce += 1; } },
  { id: 'multishot', icon: 'multi', name: '멀티샷', desc: '25% 확률로 화살을 한 발 더 쏩니다.', cost: 35, rarity: 2, max: 3,
    apply: s => { s.multishot += 1; } },
  { id: 'splash', icon: 'boom', name: '폭발 화살', desc: '맞은 적 주변에 피해의 30%를 줍니다.', cost: 40, rarity: 2, max: 3,
    apply: s => { s.splash += 1; } },
  { id: 'chain', icon: 'chain', name: '연쇄 번개', desc: '15% 확률로 주변 적 3명에게 피해 50%의 번개가 튑니다.', cost: 40, rarity: 2, max: 3,
    apply: s => { s.chain += 1; } },
  { id: 'frost', icon: 'frost', name: '서리 화살', desc: '화살에 맞은 적이 2초 동안 40% 느려집니다.', cost: 35, rarity: 2, max: 1,
    apply: s => { s.frost = 1; } },
  { id: 'execute', icon: 'skull', name: '처형자', desc: '체력이 15% 이하인 일반 적을 바로 처치합니다.', cost: 50, rarity: 3, max: 1,
    apply: s => { s.execute = 1; } },
  { id: 'bossDmg', icon: 'crown', name: '거인 사냥꾼', desc: '보스에게 주는 피해가 50% 늘어납니다.', cost: 30, rarity: 2, max: 3,
    apply: s => { s.bossDmg += 1; } },
  { id: 'firstStrike', icon: 'target', name: '선제 사격', desc: '체력이 가득 찬 적에게 두 배 피해를 줍니다.', cost: 35, rarity: 2, max: 1,
    apply: s => { s.firstStrike = 1; } },
  { id: 'berserk', icon: 'berserk', name: '광전사', desc: '잃은 체력 1%마다 피해가 1% 늘어납니다.', cost: 45, rarity: 3, max: 1,
    apply: s => { s.berserk = 1; } },

  // --- balls & cup
  { id: 'cup', icon: 'cup', name: '큰 컵', desc: '컵에 구슬이 10개 더 들어갑니다.', cost: 30, rarity: 1, max: 8,
    apply: s => { s.cupSize += 10; } },
  { id: 'pour', icon: 'bolt', name: '빠른 손목', desc: '붓는 속도가 40% 빨라집니다.', cost: 15, rarity: 1, max: 5,
    apply: s => { s.pourMul += 0.4; } },
  { id: 'quickReload', icon: 'reload', name: '빠른 재장전', desc: '컵이 비면 바로 다시 차고, 구슬이 20% 더 들어갑니다.', cost: 25, rarity: 1, max: 2,
    apply: s => { s.quickReload += 1; } },
  { id: 'twin', icon: 'twin', name: '쌍둥이 구슬', desc: '15% 확률로 구슬이 두 개씩 나옵니다.', cost: 30, rarity: 2, max: 4,
    apply: s => { s.twin += 1; } },
  { id: 'gold', icon: 'ball', name: '황금 구슬', desc: '8% 확률로 가치 3배의 금 구슬이 나옵니다.', cost: 35, rarity: 2, max: 5,
    apply: s => { s.gold += 0.08; } },
  { id: 'rainbow', icon: 'rainbow', name: '무지개 구슬', desc: '2% 확률로 가치 10배의 무지개 구슬이 나옵니다.', cost: 45, rarity: 3, max: 3,
    apply: s => { s.rainbow += 1; } },
  { id: 'goldCoin', icon: 'goldhand', name: '황금 손', desc: '금 구슬이 떨어지면 50% 확률로 코인 1개를 얻습니다.', cost: 50, rarity: 3, max: 1,
    req: s => s.gold > 0, apply: s => { s.goldCoin = 1; } },

  // --- gates
  { id: 'gate', icon: 'gate', name: '증폭', desc: '다음 웨이브의 모든 게이트 배수가 1 오릅니다.', cost: 40, rarity: 3,
    apply: s => { s.gateNext += 1; } },
  { id: 'gateWide', icon: 'gateWide', name: '넓은 게이트', desc: '게이트가 20% 넓어집니다.', cost: 35, rarity: 2, max: 3,
    apply: s => { s.gateWide += 1; } },
  { id: 'bonusGate', icon: 'gateGold', name: '바닥 게이트', desc: '구덩이 바닥에 움직이는 x2 게이트가 생깁니다.', cost: 60, rarity: 3, max: 3,
    apply: s => { s.bonusGate += 1; } },

  // --- economy
  { id: 'coin', icon: 'coin', name: '행운의 주머니', desc: '얻는 코인이 25% 늘어납니다.', cost: 25, rarity: 1, max: 4,
    apply: s => { s.coinMul += 0.25; } },
  { id: 'interest', icon: 'interest', name: '이자', desc: '웨이브를 깨면 가진 코인의 10%를 이자로 받습니다. 최대 30개까지입니다.', cost: 35, rarity: 2, max: 2,
    apply: s => { s.interest += 1; } },
  { id: 'discount', icon: 'tag', name: '단골 손님', desc: '상점 가격이 10% 내려갑니다.', cost: 40, rarity: 2, max: 3,
    apply: s => { s.discount += 1; } },
  { id: 'extraCard', icon: 'cards', name: '넓은 진열대', desc: '상점에 카드가 한 장 더 나옵니다.', cost: 60, rarity: 3, max: 1,
    apply: s => { s.extraCard = 1; } },
  { id: 'freeReroll', icon: 'reroll', name: '무료 새로고침', desc: '상점마다 한 번 무료로 새로고침합니다.', cost: 40, rarity: 2, max: 1,
    apply: s => { s.freeReroll = 1; } },
  { id: 'luck', icon: 'star', name: '행운의 별', desc: '희귀 카드와 에픽 카드가 더 자주 나옵니다.', cost: 30, rarity: 2, max: 2,
    apply: s => { s.luck += 1; } },

  // --- new: damage & control
  { id: 'poison', icon: 'poison', name: '독 화살', desc: '화살에 맞은 적이 3초 동안 피해의 30%를 독으로 받습니다.', cost: 30, rarity: 2, max: 3,
    apply: s => { s.poison += 1; } },
  { id: 'knockback', icon: 'push', name: '밀쳐내기', desc: '화살이 일반 적을 뒤로 밀어냅니다.', cost: 25, rarity: 1, max: 2,
    apply: s => { s.knockback += 1; } },
  { id: 'snipe', icon: 'target', name: '저격', desc: '화면 오른쪽 절반의 적에게 피해가 40% 늘어납니다.', cost: 25, rarity: 1, max: 2,
    apply: s => { s.snipe += 1; } },
  { id: 'smite', icon: 'chain', name: '천벌', desc: '5초마다 가장 강한 적에게 최대 체력 12%의 벼락이 떨어집니다. 보스는 3%입니다.', cost: 40, rarity: 2, max: 3,
    apply: s => { s.smite += 1; } },
  { id: 'corpseBomb', icon: 'boom', name: '시체 폭발', desc: '쓰러진 적이 터지며 주변에 그 적 최대 체력의 25% 피해를 줍니다.', cost: 35, rarity: 2, max: 2,
    apply: s => { s.corpseBomb += 1; } },
  { id: 'slowField', icon: 'frost', name: '시간 왜곡', desc: '기사 가까이 온 적이 35% 느려집니다.', cost: 35, rarity: 2, max: 1,
    apply: s => { s.slowField = 1; } },
  { id: 'nova', icon: 'boom', name: '컵 충격파', desc: '컵이 다시 찰 때 모든 적에게 충격파 피해를 줍니다.', cost: 40, rarity: 2, max: 2,
    apply: s => { s.nova += 1; } },
  { id: 'bloodPact', icon: 'berserk', name: '피의 계약', desc: '공격력이 60% 오르지만 최대 체력이 20% 줄어듭니다.', cost: 45, rarity: 3, max: 1,
    apply: s => { s.atkMul += 0.6; s.maxHp = Math.max(10, Math.round(s.maxHp * 0.8)); s.hp = Math.min(s.hp, s.maxHp); } },

  // --- new: survival & economy
  { id: 'barrier', icon: 'shield', name: '보호막', desc: '매 웨이브 첫 공격을 한 번 막아냅니다.', cost: 35, rarity: 2, max: 2,
    apply: s => { s.barrier += 1; } },
  { id: 'bounty', icon: 'coin', name: '현상금', desc: '적을 처치하면 10% 확률로 코인 5개를 더 얻습니다.', cost: 25, rarity: 1, max: 3,
    apply: s => { s.bounty += 1; } },

  // --- new: balls & gates
  { id: 'recycle', icon: 'reload', name: '구슬 회수', desc: '떨어진 구슬의 8%가 컵으로 돌아옵니다.', cost: 30, rarity: 2, max: 3,
    apply: s => { s.recycle += 1; } },
  { id: 'gateChain', icon: 'gate', name: '첫 관문', desc: '처음 지나는 게이트에서 구슬이 하나 더 생깁니다.', cost: 40, rarity: 2, max: 2,
    apply: s => { s.gateChain += 1; } },
  { id: 'megaCup', icon: 'cup', name: '거인의 컵', desc: '컵 용량이 30 늘어나지만 붓는 속도가 15% 느려집니다.', cost: 50, rarity: 3, max: 1,
    apply: s => { s.cupSize += 30; s.pourMul = Math.max(0.5, s.pourMul - 0.15); } },
  { id: 'doubleFloor', icon: 'gateGold', name: '황금 바닥', desc: '바닥 가운데 1/3에 떨어진 구슬의 가치가 두 배가 됩니다.', cost: 55, rarity: 3, max: 1,
    apply: s => { s.doubleFloor = 1; } },

  // --- ball types: value tiers (은/루비/다이아), elements (화염/얼음/번개/폭탄) and synergies
  { id: 'silver', icon: 'silverBall', name: '은 구슬', desc: '15% 확률로 가치 2배의 은 구슬이 나옵니다.', cost: 20, rarity: 1, max: 4,
    apply: s => { s.silver += 1; } },
  { id: 'ruby', icon: 'rubyBall', name: '루비 구슬', desc: '4% 확률로 가치 5배의 루비 구슬이 나옵니다.', cost: 40, rarity: 2, max: 3,
    apply: s => { s.ruby += 1; } },
  { id: 'diamond', icon: 'diamondBall', name: '다이아몬드 구슬', desc: '0.5% 확률로 가치 25배의 다이아몬드 구슬이 나옵니다.', cost: 55, rarity: 3, max: 2,
    apply: s => { s.diamond += 1; } },
  { id: 'fireBall', icon: 'fireBall', name: '화염 구슬', desc: '6% 확률로 화염 구슬이 나옵니다. 이 구슬로 쏜 화살은 적을 3초 동안 태웁니다.', cost: 30, rarity: 2, max: 3,
    apply: s => { s.fireBall += 1; } },
  { id: 'iceBall', icon: 'iceBall', name: '얼음 구슬', desc: '6% 확률로 얼음 구슬이 나옵니다. 이 구슬로 쏜 화살은 적을 느리게 하고 8% 확률로 얼립니다.', cost: 30, rarity: 2, max: 3,
    apply: s => { s.iceBall += 1; } },
  { id: 'sparkBall', icon: 'sparkBall', name: '번개 구슬', desc: '6% 확률로 번개 구슬이 나옵니다. 이 구슬로 쏜 화살은 주변 2명에게 피해 40%의 번개를 튀깁니다.', cost: 30, rarity: 2, max: 3,
    apply: s => { s.sparkBall += 1; } },
  { id: 'bombBall', icon: 'bombBall', name: '폭탄 구슬', desc: '5% 확률로 폭탄 구슬이 나옵니다. 이 구슬로 쏜 화살은 피해 50%로 터집니다.', cost: 35, rarity: 2, max: 3,
    apply: s => { s.bombBall += 1; } },
  { id: 'alchemy', icon: 'flask', name: '연금술', desc: '게이트를 지난 구슬의 등급이 4% 확률로 한 단계 오릅니다.', cost: 40, rarity: 2, max: 3,
    apply: s => { s.alchemy += 1; } },
  { id: 'polish', icon: 'gem', name: '보석 세공', desc: '은, 금, 루비, 다이아몬드 구슬의 가치가 50% 오릅니다.', cost: 35, rarity: 2, max: 2,
    req: s => s.silver > 0 || s.gold > 0 || s.ruby > 0 || s.diamond > 0, apply: s => { s.polish += 1; } },
  { id: 'elemAmp', icon: 'boom', name: '원소 증폭', desc: '원소 화살의 효과가 50% 강해집니다.', cost: 35, rarity: 2, max: 3,
    req: s => s.fireBall + s.iceBall + s.sparkBall + s.bombBall > 0, apply: s => { s.elemAmp += 1; } },
  { id: 'prism', icon: 'rainbow', name: '분광기', desc: '무지개 구슬이 떨어지면 탄약 40개와 원소 탄약을 10씩 채워 줍니다.', cost: 30, rarity: 2, max: 1,
    req: s => s.rainbow > 0, apply: s => { s.prism = 1; } },
  { id: 'diamondCut', icon: 'diamondBall', name: '다이아 컷', desc: '다이아몬드 구슬이 떨어지면 모든 적이 큰 피해를 입고 컵에 구슬 10개가 들어옵니다.', cost: 45, rarity: 3, max: 1,
    req: s => s.diamond > 0, apply: s => { s.diamondCut = 1; } },
  { id: 'rubyHeart', icon: 'rubyBall', name: '루비 심장', desc: '루비 구슬이 떨어지면 체력이 1 회복됩니다. 1초에 한 번까지입니다.', cost: 30, rarity: 2, max: 1,
    req: s => s.ruby > 0, apply: s => { s.rubyHeart = 1; } },
  { id: 'evoSilver', icon: 'silverBall', name: '백금 구슬', desc: '은 구슬이 백금으로 진화해 가치가 4배가 되고 15% 더 자주 나옵니다.', cost: 80, rarity: 4, max: 1,
    req: s => (s.bought.silver || 0) >= 4, apply: s => { s.silverVal = 4; s.silver += 1; } },
  { id: 'evoRuby', icon: 'rubyBall', name: '용의 심장', desc: '루비 구슬이 진화해 가치가 10배가 됩니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.ruby || 0) >= 3, apply: s => { s.rubyVal = 10; } },
  { id: 'elemFuse', icon: 'rainbow', name: '원소 융합', desc: '원소 화살이 화염, 얼음, 번개, 폭탄 효과를 모두 갖도록 진화합니다.', cost: 95, rarity: 4, max: 1,
    req: s => [s.fireBall, s.iceBall, s.sparkBall, s.bombBall].filter(v => v > 0).length >= 3, apply: s => { s.elemFuse = 1; } },

  // --- trigger skills: something happens -> balls drop straight into the cup
  { id: 'critRefill', icon: 'refill', name: '치명적 보충', desc: '치명타가 터지면 컵에 구슬 2개가 들어옵니다.', cost: 30, rarity: 2, max: 3,
    req: s => s.crit > 0, apply: s => { s.critRefill += 1; } },
  { id: 'killRefill', icon: 'refill', name: '전리품 구슬', desc: '적을 처치하면 20% 확률로 컵에 구슬 2개가 들어옵니다.', cost: 25, rarity: 1, max: 3,
    apply: s => { s.killRefill += 1; } },
  { id: 'comboRefill', icon: 'multi', name: '콤보 보너스', desc: '콤보 10마다 컵에 구슬 6개가 들어옵니다.', cost: 30, rarity: 2, max: 2,
    apply: s => { s.comboRefill += 1; } },
  { id: 'boomRefill', icon: 'boom', name: '폭발 회수', desc: '폭발로 적 3명 이상을 맞히면 컵에 구슬 4개가 들어옵니다.', cost: 30, rarity: 2, max: 2,
    req: s => s.splash > 0 || s.corpseBomb > 0, apply: s => { s.boomRefill += 1; } },
  { id: 'zapRefill', icon: 'chain', name: '전류 충전', desc: '번개에 맞은 적 수만큼 컵에 구슬이 들어옵니다.', cost: 30, rarity: 2, max: 2,
    req: s => s.chain > 0, apply: s => { s.zapRefill += 1; } },
  { id: 'gateJackpot', icon: 'jackpot', name: '잭팟 게이트', desc: '게이트를 지날 때 2% 확률로 잭팟이 터져 구슬 8개가 들어옵니다.', cost: 35, rarity: 2, max: 3,
    apply: s => { s.gateJackpot += 1; } },
  { id: 'hurtRefill', icon: 'heart', name: '역경의 힘', desc: '공격받으면 컵에 구슬 6개가 들어옵니다.', cost: 25, rarity: 1, max: 2,
    apply: s => { s.hurtRefill += 1; } },
  { id: 'dodgeShot', icon: 'shield', name: '반격', desc: '공격을 피하면 그 적에게 강한 화살로 반격합니다.', cost: 30, rarity: 2, max: 2,
    req: s => s.miss > 0, apply: s => { s.dodgeShot += 1; } },
  { id: 'goldChain', icon: 'ball', name: '황금 연쇄', desc: '금 구슬이 떨어지면 컵에 구슬 1개가 들어옵니다.', cost: 35, rarity: 2, max: 1,
    req: s => s.gold > 0, apply: s => { s.goldChain = 1; } },
  { id: 'supply', icon: 'crate', name: '보급 상자', desc: '웨이브가 시작될 때 구슬 20개를 더 받습니다.', cost: 25, rarity: 1, max: 3,
    apply: s => { s.supply += 1; } },
  { id: 'overcharge', icon: 'ball', name: '과충전', desc: '컵이 다시 차면 처음 15%는 금 구슬로 나옵니다.', cost: 35, rarity: 2, max: 2,
    apply: s => { s.overcharge += 1; } },
  { id: 'executeRefill', icon: 'skull', name: '처형 보상', desc: '처형할 때마다 컵에 구슬 4개가 들어옵니다.', cost: 25, rarity: 2, max: 1,
    req: s => s.execute > 0, apply: s => { s.executeRefill = 1; } },
  { id: 'ballRain', icon: 'rain', name: '구슬 비', desc: '전투 중 10초마다 컵에 구슬 10개가 들어옵니다.', cost: 35, rarity: 2, max: 3,
    apply: s => { s.ballRain += 1; } },
  { id: 'bloodBall', icon: 'drop', name: '피의 구슬', desc: '체력이 30% 이하일 때 붓는 구슬의 가치가 두 배가 됩니다.', cost: 35, rarity: 3, max: 1,
    apply: s => { s.bloodBall = 1; } },
  { id: 'bossLoot', icon: 'crown', name: '보스 전리품', desc: '보스를 쓰러뜨리면 코인 50개와 구슬 30개를 얻습니다.', cost: 30, rarity: 2, max: 1,
    apply: s => { s.bossLoot = 1; } },
  { id: 'evoMiss', icon: 'shield', name: '유령 망토', desc: '회피가 10% 오르고, 피할 때마다 구슬 4개를 얻으며 반격하도록 진화합니다.', cost: 85, rarity: 4, max: 1,
    req: s => (s.bought.miss || 0) >= 4, apply: s => { s.miss += 0.1; s.dodgeRefill += 4; s.dodgeShot += 1; } },
  { id: 'evoCup', icon: 'refill', name: '무한의 잔', desc: '컵 용량이 20 늘어나고, 6초마다 구슬 15개가 저절로 채워지도록 진화합니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.cup || 0) >= 8, apply: s => { s.cupSize += 20; s.infCup = 1; } },

  // --- legendary evolutions: appear only after the base skill is maxed
  { id: 'evoFire', icon: 'arrow', name: '폭풍 석궁', desc: '석궁이 진화해 발사 속도가 100% 빨라지고 관통이 1 늘어납니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.fire || 0) >= 6, apply: s => { s.fireMul += 1; s.pierce += 1; } },
  { id: 'evoCrit', icon: 'critDmg', name: '필살', desc: '치명타 확률이 10%, 치명타 피해가 200% 오르도록 진화합니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.crit || 0) >= 5, apply: s => { s.crit += 0.1; s.critMul += 2; } },
  { id: 'evoPour', icon: 'bolt', name: '폭포 붓기', desc: '붓는 속도가 150% 빨라지고 구슬이 두 개씩 나올 확률이 30% 오르도록 진화합니다.', cost: 80, rarity: 4, max: 1,
    req: s => (s.bought.pour || 0) >= 5, apply: s => { s.pourMul += 1.5; s.twin += 2; } },
  { id: 'evoGold', icon: 'goldhand', name: '미다스의 손', desc: '금 구슬이 진화해 가치가 6배가 됩니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.gold || 0) >= 5, apply: s => { s.goldVal = 6; } },
  { id: 'evoSplash', icon: 'boom', name: '대폭발', desc: '폭발이 진화해 피해가 90% 늘고 범위가 두 배가 됩니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.splash || 0) >= 3, apply: s => { s.splash += 3; s.splashR = 36; } },
  { id: 'evoChain', icon: 'chain', name: '뇌신', desc: '번개 확률이 30% 오르고 6명까지 이어지도록 진화합니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.chain || 0) >= 3, apply: s => { s.chain += 3; s.chainN = 6; } },
  { id: 'evoHp', icon: 'regen', name: '불멸의 몸', desc: '재생이 3 오르고 받는 피해가 2 줄어들도록 진화합니다.', cost: 80, rarity: 4, max: 1,
    req: s => (s.bought.maxhp || 0) >= 4, apply: s => { s.regen += 3; s.armor += 2; } },
  { id: 'evoMulti', icon: 'multi', name: '화살비', desc: '화살비로 진화해 언제나 한 발 더 쏩니다.', cost: 90, rarity: 4, max: 1,
    req: s => (s.bought.multishot || 0) >= 3, apply: s => { s.extraShot += 1; } },
];
const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

function skillCost(sk) {
  const n = S.bought[sk.id] || 0;
  const disc = 1 - 0.1 * (S.discount || 0);
  return Math.max(1, Math.round(sk.cost * (1 + 0.5 * n) * (1 + (S.wave - 1) * 0.05) * disc));
}

function availableSkills() {
  return SKILLS.filter(sk => {
    if (sk.max && (S.bought[sk.id] || 0) >= sk.max) return false;
    if (sk.req && !sk.req(S)) return false;
    return true;
  });
}

let lastOfferIds = [];
function rollOffers(count = 3) {
  const pool = availableSkills().slice();
  const out = [];
  const luck = (S && S.luck) || 0;
  // legendary evolutions are always highly likely once unlocked; cards from the last roll are rarer
  const weight = sk => {
    const base = sk.rarity === 4 ? 10 : sk.rarity === 3 ? 1 + luck : sk.rarity === 2 ? 2 + luck * 0.5 : 3;
    return lastOfferIds.includes(sk.id) ? base * 0.3 : base;
  };
  while (out.length < count && pool.length) {
    const total = pool.reduce((a, sk) => a + weight(sk), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= weight(pool[idx]); if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    const sk = pool.splice(idx, 1)[0];
    out.push({ sk, cost: skillCost(sk), sold: false });
  }
  lastOfferIds = out.map(o => o.sk.id);
  return out;
}

function grantSkill(sk) {
  sk.apply(S);
  S.bought[sk.id] = (S.bought[sk.id] || 0) + 1;
  if (sk.rarity === 4) unlock('evolve');
}
