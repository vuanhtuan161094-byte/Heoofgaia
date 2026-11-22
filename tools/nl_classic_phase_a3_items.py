"""A3: deterministic WEB-era Bạc/Lương equipment pricing (PROJECT_SIMULATED).

Transforms only in-memory runtime copies, never the source Wiki catalogue or Save v5.
"""
from __future__ import annotations
from copy import deepcopy

def classic_fee(old: dict) -> dict:
    result=dict(old)
    historical_iron=result.pop("iron",0)
    if not isinstance(historical_iron,int) or isinstance(historical_iron,bool) or historical_iron<0:
        raise ValueError("A3_INVALID_HISTORICAL_FEE")
    if historical_iron:
        result["silver"]=result.get("silver",0)+historical_iron*4
        result["grain"]=result.get("grain",0)+(historical_iron+1)//2
    if any(not isinstance(v,int) or isinstance(v,bool) or v<0 for v in result.values()):
        raise ValueError("A3_INVALID_CORE_PRICE")
    # Omit zero-fee source keys (e.g. 'prestige': 0). They are not a
    # payment requirement and should not appear as 0 Uy danh in the shop.
    return {key:value for key,value in result.items() if value > 0}

def project_a3(catalogue:dict,rules:dict)->tuple[dict,dict]:
    pack,model=deepcopy(catalogue),deepcopy(rules)
    active=[x for x in pack["equipment"] if x["integration"]=="PLAYABLE"]
    if len(active)!=411:
        raise ValueError("A3_GEAR_COUNT_DRIFT")
    for row in active:
        acquisition=row.get("acquisitionRule") or {}
        # Some PLAYABLE gear is reward-only: shopCost=None means it is
        # never purchased, so preserve that source contract unchanged.
        if isinstance(acquisition.get("shopCost"),dict):
            acquisition["shopCost"]=classic_fee(acquisition["shopCost"])
        elif acquisition.get("shopCost") is not None:
            raise ValueError("A3_INVALID_SHOP_COST_"+row["id"])
        if "iron" in (acquisition.get("shopCost") or {}):
            raise ValueError("A3_IRON_COST_"+row["id"])
    r=model["reinforcement"]
    old_base,old_power=r.pop("ironBase"),r.pop("ironExponent")
    r["classicA3Pricing"]=True
    r["silverSupplementBase"]=4*old_base
    r["silverSupplementExponent"]=old_power
    r["grainBase"]=(old_base+1)//2
    r["grainExponent"]=old_power
    model["resources"]=sorted((set(model.get("resources",[]))-{"iron"})|{"silver","grain","prestige"})
    model["classicA3"]={"version":"classic-a3-silver-grain-v1","provenance":"PROJECT_SIMULATED",
        "silverPerHistoricIron":4,"grainPerTwoHistoricIron":1,"playableGear":411,
        "legacySaveIronPreserved":True,"saveSchema":5}
    return pack,model
