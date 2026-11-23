"""B2 classic morale roles within the single native P2 engine.

No shadow combat resolver, damage calculation, timer or reward writer.
Existing Save-v5 troopModes stores 'dancer'; 25 project troop IDs stay canonical.
Stages 25-28 and non-campaign combat retain legacy semantics.
"""
from __future__ import annotations


def replace_compat(source: str, old: str, new: str, label: str) -> str:
    n_old, n_new = source.count(old), source.count(new)
    # Some new snippets intentionally contain the old substring, e.g.
    # "if(classicB2)for(...)". Check complete patched marker first.
    if n_new == 1:
        return source
    if n_old == 1 and n_new == 0:
        return source.replace(old, new, 1)
    raise ValueError(
        f"NL_B2_SOURCE_DRIFT {label}: old={n_old} new={n_new}"
    )


PATCHES = [
    ("role label",
     "support:'Y quan',drum:'Cổ Hiệu Quân'};",
     "support:'Y quan',drum:'Kỳ Cổ Thủ',dancer:'Vũ Nữ'};"),
    ("role selection to native p2Unit",
     "const troop=game.troopModes[id]==='drum'&&['support','strategist'].includes(h.type)?'drum':h.type;",
     "const troop=['drum','dancer'].includes(game.troopModes[id])&&['support','strategist'].includes(h.type)?game.troopModes[id]:h.type;"),
    ("formation instruction",
     "Trống <b>không đánh thường</b>, mỗi lần hành động tăng <b>34 sĩ khí</b> đồng minh; đủ 100 sĩ khí tăng <b>55 sĩ khí</b> và giảm sĩ khí địch. Đánh đổi sát thương/chữa trị lấy nhịp chiến pháp.",
     "Kỳ Cổ Thủ đánh trống thường tăng <b>25 sĩ khí</b> toàn phe, đạt 100 sĩ khí có kỹ năng tăng <b>45 sĩ khí</b>. Vũ Nữ đánh thường trừ <b>45 sĩ khí</b> một địch và tăng 34 cho bản thân. Ngưỡng thi triển Chiến pháp là 100 sĩ khí."),
    ("base mode selection highlight",
     "game.troopModes[id]==='drum'?'':'picked'",
     "['drum','dancer'].includes(game.troopModes[id])?'':'picked'"),
    ("dancer UI choice",
     'data-troop-mode="§{id}:drum">🥁 Trống</button></div>',
     'data-troop-mode="§{id}:drum">🥁 Kỳ Cổ Thủ</button><button class="dark-button §{game.troopModes[id]===\'dancer\'?\'picked\':\'\'}" data-troop-mode="§{id}:dancer">💃 Vũ Nữ</button></div>'),
    ("mode validator",
     "||!['base','drum'].includes(mode))return;",
     "||!['base','drum','dancer'].includes(mode))return;"),
    ("Save-v5 persisted mode value",
     "else game.troopModes[id]='drum';",
     "else game.troopModes[id]=mode;"),
    ("troop mode log",
     "mode==='drum'?'Cổ Hiệu Quân':HEROES[id].role",
     "mode==='drum'?'Kỳ Cổ Thủ':mode==='dancer'?'Vũ Nữ':HEROES[id].role"),
    ("normal Kỳ Cổ Thủ 25, skill 45",
     "const delta=skill?55:34;for(const u of allies)p2Morale(u,delta);",
     "const classicB2=battle.mode==='campaign'&&battle.stage<=24;const eliteB2=classicB2&&a.team==='e'&&!!NL_GAME_DATA.campaign.encounters.find(e=>e.stage===battle.stage)?.nlB2EliteMorale;const delta=classicB2&&!eliteB2?(skill?45:25):(skill?55:34);for(const u of allies)p2Morale(u,delta);"),
    ("only non-classic drum debuffs enemies",
     "for(const u of enemies)p2Morale(u,skill?-15:-5);",
     "if(!classicB2||eliteB2)for(const u of enemies)p2Morale(u,skill?-15:-5);"),
    ("only non-classic drum gains bonus 7",
     "if(skill)p2Morale(a,-100);else p2Morale(a,7);",
     "if(skill)p2Morale(a,-100);else if(!classicB2||eliteB2)p2Morale(a,7);"),
    ("drum action log matches actual effects",
     "skill?', phe địch −15 sĩ khí':''",
     "(skill&&(!classicB2||eliteB2))?', phe địch −15 sĩ khí':''"),
    ("Vũ Nữ action within original P2",
     " else if(skill&&descriptor.pattern==='heal'){",
     """ else if(a.troop==='dancer'&&!skill&&battle.mode==='campaign'&&battle.stage<=24){
   const target=p2Target(a,'front');if(!target)return;
   p2Morale(target,-45);
   mode='dancer';kind='drum';
   description='💃 '+actorName+' dùng Vũ Nữ nhiễu loạn '+target.name+': −45 sĩ khí địch.';
 }
 else if(skill&&descriptor.pattern==='heal'){"""),
    ("Vũ Nữ actor gains 34 morale",
     "if(a.troop!=='drum'&&!stunned)p2Morale(a,skill?13:(a.type==='strategist'?34:25));",
     "if(a.troop!=='drum'&&!stunned)p2Morale(a,skill?13:(a.troop==='dancer'?34:a.type==='strategist'?34:25));"),
    ("dancer VFX action event",
     "if(ev.mode==='drum'&&a)battle.fx.push",
     "if((ev.mode==='drum'||ev.mode==='dancer')&&a)battle.fx.push"),
]


def apply_b2_native(source: str) -> str:
    for name, old, new in PATCHES:
        source = replace_compat(
            source, old.replace('§', chr(36)), new.replace('§', chr(36)), name
        )
    return source
