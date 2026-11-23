#!/usr/bin/env python3
"""Check original P2 B2 patch contracts, idempotence and source drift detection."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from nl_classic_phase_b2_native import PATCHES,replace_compat

def main():
    for label,old,new in PATCHES:
        old=old.replace("§","$")
        new=new.replace("§","$")
        assert old!=new and old and new,label
        initial="PRE-"+old+"-POST"
        patched=replace_compat(initial,old,new,label)
        assert patched=="PRE-"+new+"-POST",label
        assert replace_compat(patched,old,new,label)==patched,label
        try:
            replace_compat("INVALID_CODE",old,new,label)
        except ValueError:pass
        else:raise AssertionError(label+" did not flag upstream drift")
    print(f"NL_CLASSIC_B2_PATCH_PASS {len(PATCHES)} contracts",flush=True)
    return 0
if __name__=="__main__":
    raise SystemExit(main())
