# Prompt sweep

Generated 2026-11-19T22:40:57.133Z. "problems" are floor and meaning findings from verify --explore, distinct by rule and element; "surfaces" is surfaces found / openers seen. Per 10 kB normalises for size.

| cell | builder | brief | process | kB | surfaces | problems | on surfaces | per 10 kB | lint (floor/meaning) | top rules |
|---|---|---|---|---|---|---|---|---|---|---|
| s-stun-one | Sonnet 5.5 | stun | one | 54 | 11/12 | 75 | 49 | 13.9 | 0/12 | small-target 30, text-on-gradient 12, low-contrast 12, decorative-depth 5 |
| c-stun-iter | gpt-6.2-sol | stun | iter | 103 | 12/14 | 51 | 31 | 4.9 | 0/13 | small-target 30, low-contrast 13, flat-emphasis 5, redundant-enclosure 2 |
| c-stun-one | gpt-6.2-sol | stun | one | 99 | 15/15 | 50 | 34 | 5.0 | 0/8 | small-target 39, text-on-gradient 5, flat-emphasis 4, redundant-enclosure 1 |
| s-stun-iter | Sonnet 5.5 | stun | iter | 48 | 14/17 | 49 | 28 | 10.1 | 0/9 | small-target 27, text-on-gradient 10, low-contrast 5, decorative-depth 2 |
| c-det-one | gpt-6.2-sol | det | one | 102 | 13/13 | 40 | 27 | 3.9 | 0/4 | small-target 29, redundant-enclosure 3, flat-emphasis 3, text-overflow 2 |
| c-det-iter | gpt-6.2-sol | det | iter | 122 | 13/13 | 39 | 31 | 3.2 | 0/1 | small-target 31, flat-emphasis 5, redundant-enclosure 2, destructive-unseparated 1 |
| c-terse-one | gpt-6.2-sol | terse | one | 77 | 12/12 | 39 | 28 | 5.1 | 0/0 | small-target 34, flat-emphasis 3, low-contrast 1, surface-offscreen 1 |
| c-terse-iter | gpt-6.2-sol | terse | iter | 106 | 15/15 | 35 | 24 | 3.3 | 0/6 | small-target 28, low-contrast 2, too-many-peers 1, destructive-unseparated 1 |
| s-terse-one | Sonnet 5.5 | terse | one | 26 | 6/7 | 31 | 18 | 12.1 | 0/4 | small-target 22, low-contrast 7, destructive-unseparated 1, covers-trigger 1 |
| s-terse-iter | Sonnet 5.5 | terse | iter | 34 | 11/11 | 28 | 14 | 8.3 | 0/1 | small-target 22, destructive-unseparated 2, low-contrast 2, decorative-motion 1 |
| s-det-iter | Sonnet 5.5 | det | iter | 57 | 10/10 | 21 | 10 | 3.7 | 0/0 | small-target 14, low-contrast 3, decorative-symbol 1, destructive-unseparated 1 |
| s-det-one | Sonnet 5.5 | det | one | 46 | 7/7 | 17 | 4 | 3.7 | 0/0 | small-target 11, low-contrast 5, destructive-unseparated 1 |

## Mean problems by factor

- builder: Sonnet 5.5 36.8 (n=6) · gpt-6.2-sol 42.3 (n=6)
- brief: stun 56.3 (n=4) · det 29.3 (n=4) · terse 33.3 (n=4)
- process: one 42.0 (n=6) · iter 37.2 (n=6)

## Iterative cells, round by round (1280 light)

| cell | r0 | r1 | r2 | r3 | r4 | r5 | r6 |
|---|---|---|---|---|---|---|---|
| c-stun-iter | 16 (67 kB) | 18 (75 kB) | 18 (77 kB) | 18 (86 kB) | 20 (97 kB) | 22 (103 kB) | 22 (103 kB) |
| s-stun-iter | 20 (27 kB) | 20 (31 kB) | 20 (32 kB) | 21 (34 kB) | 21 (37 kB) | 22 (41 kB) | 22 (48 kB) |
| c-det-iter | 2 (72 kB) | 2 (80 kB) | 2 (87 kB) | 4 (106 kB) | 6 (113 kB) | 6 (122 kB) | 6 (122 kB) |
| c-terse-iter | 5 (72 kB) | 5 (80 kB) | 5 (82 kB) | 7 (88 kB) | 7 (93 kB) | 8 (100 kB) | 7 (106 kB) |
| s-terse-iter | 6 (16 kB) | 6 (19 kB) | 6 (21 kB) | 4 (25 kB) | 4 (28 kB) | 9 (31 kB) | 9 (34 kB) |
| s-det-iter | 2 (22 kB) | 7 (26 kB) | 7 (33 kB) | 8 (41 kB) | 4 (45 kB) | 7 (50 kB) | 8 (57 kB) |
