# Initial traversal pass
Base main: 35de47e7468433bc643878e4d197bb74139db1a0.
Reference: Nintendo's NES Ninja Gaiden manual wall-spring/zigzag climbing section. This is a first terrain pass, not an exhaustive stage-map recreation.
All seven lands receive paired climbable walls, staggered landing ledges and elevated reward paths. Combat arenas are preserved. A second jump press spends one aerial leap; landing restores it. Carved seams improve wall readability. Hammer active timings are unchanged.
Validation: 42 hammer and 28 alternate campaign completions; 311 original/layout checks, 262 weapon checks, campaign checks, 9 action, 13 audio, 6 SDK mock, 11 input checks. 20 dedicated traversal checks; static, standalone and 15 bundle checks pass. Full suite and dedicated traversal checks passed after the final movement change. Rendering also limits nearby teaching prompts to one and follows high jumps vertically.
Browser: desert terrain rendered and inspected. Manual input timing did not establish reliable wall-to-wall feel verification. Physical devices and actual YouTube host are untested. Human play review remains necessary.
