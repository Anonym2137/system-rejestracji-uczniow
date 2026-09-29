# Zasady commitów

Używamy uproszczonej konwencji [Conventional Commits](https://www.conventionalcommits.org/).

## Format

```
<typ>: <opis>
```

Możliwe typy:

- **feat** — nowa funkcjonalność
- **fix** — poprawka błędu
- **refactor** — refaktoryzacja bez zmian zachowania
- **chore** — build, zależności, konfiguracja, niezwiązane z kodem biznesowym
- **docs** — dokumentacja
- **test** — testy

## Przykłady

```
feat: dodaj endpoint zwrotu ucznia
fix: popraw walidację reason w POST /api/leaves
docs: dodaj README i .env.example
chore: dodaj skrypty db:generate/db:migrate
feat: podłącz stronę historii do bazy danych
refactor: wydziel endpointy students/classes
```

## Scope (opcjonalnie)

Można dopisać scope w nawiasie po typie: `feat(api): ...`, `fix(dashboard): ...`. Nie jest wymagany.

## Versionowanie

Repo używa semantycznego versioning (major.minor.patch), ale tagowanie jest ręczne. Publikując release, zwiększ:
- **patch** — naprawy błędów, drobne poprawki
- **minor** — nowa funkcjonalność wstecznie kompatybilna
- **major** — przerwanie kompatybilności

## Commit message

- Po `:` stawiamy spację, opis piszemy z wielkiej litery.
- Krótki opis (najlepiej jedna linia, max ~72 znaki).
- Jeśli potrzebujesz więcej kontekstu, dodaj puste pole i opis poniżej.
- Nie commitujemy plików `.env`, `node_modules`, `.next`, `build`.

## Checklist przed commitem

- [ ] `npm run lint` bez błędów (warningi można zostawić, jeśli nie blokują)
- [ ] `npm run build` przechodzi (jeśli dotyczy)
- [ ] Nie ma sekretów w kodzie (API keys, hasła w `.env` nie są commitowane)
