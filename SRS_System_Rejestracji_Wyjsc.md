



**SPECIFIKACJA WYMAGAŃ SYSTEMOWYCH**

**(SRS)**

System rejestracji wyjść uczniów\
z zajęć w czasie lekcji


**Wersja dokumentu:** 1.0

**Data:** 2026

**Status:** Dokument roboczy / MVP

**Podstawa:** Karta projektu (G. Szymkowiak) + implementacja MVP


# **1. Wstęp**
## **1.1. Cel dokumentu**
Celem dokumentu jest określenie wymagań funkcjonalnych i niefunkcjonalnych systemu rejestracji wyjść uczniów podczas zajęć lekcyjnych. Dokument stanowi podstawę do projektowania, implementacji, testów i odbioru systemu oraz punkt odniesienia dla dalszych prac analitycznych i implementacyjnych.
## **1.2. Zakres systemu**
**System umożliwia:**

- rejestrowanie wyjść i powrotów uczniów podczas aktywnej lekcji
- podgląd uczniów znajdujących się poza salą
- automatyczne zapisywanie czasu wyjścia i powrotu
- przechowywanie historii zdarzeń
- zarządzanie klasami, uczniami i użytkownikami
- kontrolę dostępu według ról użytkowników

**Poza zakresem (MVP):**

- pełna ewidencja obecności uczniów
- wpisywanie ocen, usprawiedliwianie nieobecności
- obsługa dziennika elektronicznego
- planowanie zastępstw, dokumentacja pedagogiczna
- identyfikacja RFID/NFC, kody QR
- panel rodzica / panel ucznia
- zaawansowana analityka predykcyjna
- pełna integracja z zewnętrznymi systemami szkolnymi
## **1.3. Definicje i skróty**

|**Pojęcie**|**Znaczenie**|
| :- | :- |
|Wyjście|Opuszczenie sali przez ucznia w czasie lekcji (np. toaleta, sekretariat)|
|Aktywne wyjście|Wyjście bez zarejestrowanego powrotu|
|Lekcja / sesja lekcji|Okres, w którym nauczyciel prowadzi zajęcia i może rejestrować wyjścia|
|MVP|Minimalna użyteczna wersja produktu|
|SRS|Software Requirements Specification – Specyfikacja Wymagań Systemowych|
|RB|Reguła biznesowa|
|WF / WN|Wymaganie funkcjonalne / niefunkcjonalne|
## **1.4. Odniesienia**
- Karta projektu: System rejestracji wyjść uczniów z zajęć w czasie lekcji (oprac. G. Szymkowiak)
- Implementacja: aplikacja webowa (Next.js, Drizzle ORM, SQLite, Better Auth)
# **2. Ogólny opis systemu**
## **2.1. Perspektywa produktu**
Aplikacja webowa działająca w przeglądarce internetowej, przeznaczona do użytku w szkole podczas realnych zajęć lekcyjnych. Nauczyciel rejestruje wyjścia i powroty uczniów; administrator zarządza danymi organizacyjnymi; wychowawca korzysta z historii i statystyk.
## **2.2. Funkcje systemu (przegląd)**
- 1. Logowanie i kontrola dostępu
- 2. Rozpoczęcie i zakończenie lekcji
- 3. Lista uczniów klasy
- 4. Rejestracja wyjścia (z powodem i czasem)
- 5. Rejestracja powrotu
- 6. Widok aktywnych wyjść
- 7. Historia wyjść z filtrowaniem
- 8. Zarządzanie klasami i uczniami
- 9. Zarządzanie użytkownikami i rolami
## **2.3. Charakterystyka użytkowników**

|**Rola**|**Opis**|**Główne zadania**|
| :- | :- | :- |
|Nauczyciel|Podstawowy użytkownik operacyjny|Start/koniec lekcji, rejestracja wyjścia i powrotu, aktywne wyjścia|
|Wychowawca|Użytkownik danych historycznych|Historia, filtry, statystyki, raporty|
|Administrator|Zarządzanie systemem|Użytkownicy, klasy, uczniowie, konfiguracja, korekty|
|Pedagog/psycholog (poza zakresem MVP)|Ograniczony dostęp do danych|Przegląd w zakresie uprawnień|
## **2.4. Ograniczenia**
- O-01: system przetwarza dane dotyczące uczniów (minimalizacja zakresu danych)
- O-03 / O-04: interfejs nauczyciela musi być prosty; minimalna liczba operacji podczas lekcji
- O-05: działanie w przeglądarce internetowej
- O-06: możliwość wdrożenia w środowisku szkolnym
- O-07: uwzględnienie różnych ról użytkowników
## **2.5. Założenia**
- Z-01: szkoła posiada aktualne listy uczniów i klas
- Z-02: nauczyciele mają dostęp do urządzeń z przeglądarką
- Z-03: użytkownicy posiadają indywidualne konta
- Z-04: system jest wykorzystywany podczas rzeczywistych zajęć
- Z-05: nauczyciel odpowiada za rejestrowanie bieżących wyjść i powrotów
- Z-06: administrator odpowiada za poprawność danych organizacyjnych
- Z-07 / Z-08: system rozwijany etapami; najpierw minimalna użyteczna wersja (MVP)
# **3. Wymagania funkcjonalne**
## **3.1. Uwierzytelnianie i autoryzacja**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-01|System umożliwia logowanie użytkownika|Must|
|WF-02|Dostęp do funkcji zależy od roli (nauczyciel, wychowawca, administrator)|Must|
|WF-03|Użytkownik może się wylogować (z potwierdzeniem) — dotyczy wszystkich stron aplikacji|Should|
## **3.2. Lekcja**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-10|Nauczyciel może rozpocząć lekcję (wybór klasy, przedmiot)|Must|
|WF-11|Nauczyciel może zakończyć lekcję|Must|
|WF-12|Wyjście można zarejestrować tylko podczas aktywnej lekcji|Must|
|WF-13|System wyświetla informacje o bieżącej lekcji (klasa, przedmiot, status)|Must|
## **3.3. Rejestracja wyjść i powrotów**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-20|Nauczyciel rejestruje wyjście ucznia z wyborem powodu (powód obowiązkowy)|Must|
|WF-21|System automatycznie zapisuje czas wyjścia|Must|
|WF-22|Nauczyciel rejestruje powrót ucznia; powrót jest też rejestrowany automatycznie przy zakończeniu lekcji, jeśli uczeń nie wrócił|Must|
|WF-23|System automatycznie zapisuje czas powrotu|Must|
|WF-24|Uczeń może mieć maksymalnie jedno aktywne wyjście (wymuszone indeksem unikalnym w bazie)|Must|
|WF-25|Powrót dotyczy wyłącznie istniejącego aktywnego wyjścia|Must|
|WF-26|Czas powrotu nie może być wcześniejszy niż czas wyjścia (walidowane również przy korekcie danych)|Must|
|WF-27|Po powrocie status ucznia zmienia się na „w sali”|Must|

Domyślne powody wyjścia: Toaleta, Sekretariat, Pedagog, Pielęgniarka, Inny.
## **3.4. Widoki operacyjne (pulpit nauczyciela)**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-30|Lista uczniów klasy ze statusem (w sali / poza salą)|Must|
|WF-31|Widok aktywnych wyjść (kto, powód, godzina)|Must|
|WF-32|Wyszukiwanie ucznia na liście|Should|
|WF-33|Podstawowe statystyki na pulpicie (aktywne wyjścia, klasa, status lekcji)|Should|
## **3.5. Historia**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-40|System przechowuje historię wyjść|Must|
|WF-41|Uprawnieni użytkownicy mogą przeglądać i filtrować historię|Must|
|WF-42|Możliwość analizy podstawowych statystyk historycznych|Should|
## **3.6. Zarządzanie klasami i uczniami**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-50|Administrator może dodawać, edytować i usuwać klasy|Must|
|WF-51|Administrator może dodawać, edytować i usuwać uczniów; wychowawca może dodawać, edytować i usuwać uczniów swojej klasy|Must|
|WF-52|Uczeń jest przypisany do klasy|Must|
|WF-53|Usunięcie klasy możliwe tylko gdy nie ma przypisanych uczniów (wymuszone w bazie i API)|Should|
|WF-54|Lista klas i uczniów z wyszukiwaniem|Should|
## **3.7. Użytkownicy**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-60|Administrator zarządza kontami użytkowników (dodawanie, aktywacja/dezaktywacja, usuwanie)|Must|
|WF-61|System obsługuje role: nauczyciel, wychowawca, administrator|Must|
## **3.8. Spójność i korekty danych**

|**ID**|**Wymaganie**|**Priorytet**|
| :- | :- | :- |
|WF-70|Możliwość korekty błędnych danych z zachowaniem historii zmian (audit)|Should|
|WF-71|Zmiana danych historycznych pozostawia ślad (autor, czas)|Should|
# **4. Reguły biznesowe**

|**ID**|**Reguła**|
| :- | :- |
|RB-01|Uczeń może mieć maksymalnie jedno aktywne wyjście|
|RB-02|Wyjście rejestruje się tylko podczas aktywnej lekcji|
|RB-03|Powrót dotyczy tylko istniejącego aktywnego wyjścia|
|RB-04|Czas powrotu nie może być wcześniejszy niż czas wyjścia|
|RB-05|Zakończenie wyjścia ustawia status ucznia na „w sali”|
|RB-06|Dane historyczne dostępne tylko dla uprawnionych ról|
|RB-07|Istotne zmiany danych pozostawiają ślad audytowy (autor zmiany)|
# **5. Wymagania niefunkcjonalne**

|**ID**|**Kategoria**|**Wymaganie**|
| :- | :- | :- |
|WN-01|Użyteczność|Interfejs nauczyciela prosty; minimalna liczba czynności przy rejestracji wyjścia/powrotu|
|WN-02|Użyteczność|Podstawowe funkcje dostępne bez specjalistycznego szkolenia|
|WN-03|Wydajność|Rejestracja wyjścia/powrotu w czasie akceptowalnym podczas lekcji|
|WN-04|Dostępność|Działanie w popularnych przeglądarkach na urządzeniach nauczycieli|
|WN-05|Bezpieczeństwo|Kontrola dostępu według roli; sesje użytkowników|
|WN-06|Bezpieczeństwo|Minimalizacja zakresu danych osobowych uczniów|
|WN-07|Niezawodność|Trwałe przechowywanie danych; spójność po ponownym uruchomieniu|
|WN-08|Rozszerzalność|Architektura umożliwiająca późniejsze funkcje (raporty, integracje, RFID)|
# **6. Model danych (logiczny)**
Główne byty systemu:

- User – użytkownik systemu (rola: admin / teacher / educator)
- SchoolClass – klasa szkolna
- Student – uczeń (imię, nazwisko, przypisanie do klasy)
- LessonSession – sesja lekcji (klasa, nauczyciel, przedmiot, flaga aktywności)
- StudentLeave – wyjście ucznia (uczeń, sesja, powód, leftAt, returnedAt)
- AuditLog – dziennik zmian (autor, obiekt, akcja, stare/nowe wartości)

Status „poza salą” oznacza rekord StudentLeave z returnedAt = NULL dla bieżącej sesji lekcji.
# **7. Interfejsy zewnętrzne**
## **7.1. Interfejs użytkownika**
Aplikacja webowa (responsive). Główne widoki:

- Pulpit (panel nauczyciela)
- Historia
- Klasy i uczniowie
- Ustawienia
- Logowanie
## **7.2. Interfejsy programowe**
- Server Actions / REST API (backend)
- Baza danych: SQLite (Drizzle ORM) w MVP; możliwa migracja na inne silniki
## **7.3. Komunikacja**
- HTTPS w środowisku produkcyjnym
# **8. Kryteria sukcesu i odbioru**
## **8.1. Kryteria sukcesu (wybrane z karty projektu)**
- KS-01 / KS-02: nauczyciel może szybko zarejestrować wyjście i powrót ucznia
- KS-03: system poprawnie wskazuje uczniów znajdujących się poza salą
- KS-04 / KS-05: każde wyjście posiada zapis czasu; system przechowuje historię
- KS-06: użytkownicy mają dostęp wyłącznie do funkcji wynikających z uprawnień
- KS-07: dane pozostają spójne po ponownym uruchomieniu systemu
- KS-08: system działa na urządzeniach wykorzystywanych przez nauczycieli
- KS-09: użytkownicy korzystają z podstawowych funkcji bez specjalistycznego szkolenia
- KS-10: system spełnia wymagania określone dla MVP
## **8.2. Kryteria odbioru**
- zaimplementowano wszystkie funkcje obowiązkowe dla MVP
- krytyczne przypadki testowe zakończyły się powodzeniem
- brak błędów uniemożliwiających korzystanie z podstawowych funkcji
- system przechowuje dane w sposób trwały
- mechanizm autoryzacji działa zgodnie z założeniami
- możliwe jest odtworzenie historii wyjścia
- dostępna jest dokumentacja użytkowa i techniczna
- właściciel biznesowy zaakceptował rozwiązanie
# **9. Zakres MVP – checklista**

|**Funkcja**|**Priorytet**|**Uwagi implementacyjne**|
| :- | :- | :- |
|Logowanie|Must|Better Auth|
|Role użytkowników|Must|admin / teacher / educator|
|Lista klas i uczniów|Must|Strona Klasy i uczniowie|
|Start / koniec lekcji|Must|Pulpit nauczyciela|
|Rejestracja wyjścia|Must|Powód + automatyczny czas|
|Rejestracja powrotu|Must|Aktualizacja returnedAt|
|Aktywne wyjścia|Must|Panel na pulpicie|
|Historia + filtrowanie|Must|Strona Historia|
|Panel administratora|Must|Strona Ustawienia|
# **10. Główne ryzyka i mitygacja**

|**ID**|**Ryzyko**|**Poziom**|**Mitygacja**|
| :- | :- | :- | :- |
|R-01|Nauczyciele nie będą regularnie korzystać z systemu|Wysoki|Prosty interfejs, udział w testach|
|R-02|Obsługa będzie zbyt czasochłonna|Wysoki|Minimalna liczba kliknięć|
|R-03|Dane będą niekompletne|Wysoki|Widok aktywnych wyjść, ostrzeżenia|
|R-04|Brak rejestracji powrotu ucznia|Wysoki|Czytelny panel aktywnych wyjść|
|R-05|Zbyt szeroki dostęp do danych|Wysoki|Role i uprawnienia, kontrola dostępu|
|R-06|Nadmierne gromadzenie danych|Wysoki|Minimalizacja danych|
|R-07|Rozszerzanie zakresu projektu|Średni|Jednoznaczne MVP, zarządzanie zmianami|
|R-08|Problemy techniczne z dostępnością|Średni|Testy na urządzeniach szkolnych|
|R-09|Nieaktualne dane uczniów i klas|Średni|Panel zarządzania danymi|
|R-10|Błędna interpretacja statystyk|Średni|Proste, jednoznaczne wskaźniki|
# **11. Proponowane założenia technologiczne**

|**Warstwa**|**Technologia**|
| :- | :- |
|Frontend|Next.js (React), Tailwind CSS|
|Backend|Next.js Server Actions / API Routes|
|ORM / baza|Drizzle ORM, SQLite (MVP)|
|Autentykacja|Better Auth|
|Komunikacja|HTTPS w środowisku produkcyjnym|

*— Koniec dokumentu —*
System rejestracji wyjść uczniów  |  SRS v1.0  |  Strona 
