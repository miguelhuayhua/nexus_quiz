# Banqueo Refinement Implementation Plan

## Phase 1: Quick Wins (Badges, Labels, Styling)
1. **Difficulty badges**: Change "Difícil/Medio/Fácil" → "ALTA/MEDIA/BAJA" across all files
2. **Sidebar Pro badge**: Change amber → gold color
3. **Remove labels in prueba**: Remove gestión, tema title, código badge

## Phase 2: Results & Solucionario
4. **Result bars**: Display percentages instead of counters  
5. **Remove student attempt counts** from resultado page
6. **Like/dislike buttons** in solucionario
7. **Clearer repaso results messages**

## Phase 3: Create Banqueo Form
8. **Hide filtered questions table**
9. **Single create button** (merge generate + save into one flow)
10. **Auto-redirect to test** after creation
11. **Equitable question distribution** in API

## Phase 4: Test Interface
12. **Lettered option bullets** (A, B, C, D)
13. **Randomize option order**
14. **Difficulty badge display** in test
15. **Time alert modal** (5 min, don't remind me, pause/exit)
16. **Test resumption**

## Phase 5: New Routes & Cards
17. **Create /inicio route** 
18. **Standardize card layouts** in banqueos/mis-banqueos
19. **Route protection** (token verification)
