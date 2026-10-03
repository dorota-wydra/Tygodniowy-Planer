# Mój planer treningów — Specyfikacja funkcjonalna

**Wersja dokumentu:** 1.0  
**Data:** 25.06.2026  
**Przeznaczenie:** Opis aplikacji dla osoby nieposiadającej wiedzy technicznej

---

## 1. Czym jest aplikacja?

**Mój planer treningów** to prosta aplikacja internetowa działająca w przeglądarce na telefonie i komputerze. Służy do planowania i śledzenia treningów w ciągu tygodnia.

Aplikacja **nie wymaga zakładania konta ani logowania**. Wszystkie dane zapisywane są bezpośrednio w pamięci przeglądarki na urządzeniu użytkownika (localStorage). Oznacza to, że:

- dane są dostępne tylko na tym urządzeniu i w tej przeglądarce, w której były wpisane,
- dane nie są wysyłane nigdzie do internetu — pozostają prywatne,
- wyczyszczenie historii przeglądania usuwa wszystkie dane aplikacji.

---

## 2. Widok główny — budowa ekranu

Po otwarciu aplikacji użytkownik widzi:

### Górny pasek (nagłówek)
Zawiera nazwę aplikacji oraz trzy przyciski:
- **Niezaplanowany** — dodaje trening, który nie był wcześniej zaplanowany
- **Wklej plan** — importuje tygodniowy plan wpisany jako tekst
- **Nowy tydzień** — pojawia się, gdy istnieją jakiekolwiek treningi; archiwizuje bieżący tydzień i zaczyna nowy

### Zakładki
Pod nagłówkiem widoczne są dwie zakładki:
- **Ten tydzień** — aktualny tydzień z treningami
- **Historia** — archiwum poprzednich tygodni

### Pasek postępu
Wizualna belka złożona z 7 segmentów. Każdy ukończony (odhaczony) trening zapala kolejny segment. Licznik po prawej stronie pokazuje np. `3 / 7`. Maksymalna wartość to 7 — niezależnie od tego, ile treningów użytkownik doda.

### Lista dni tygodnia
Siedem kart — po jednej na każdy dzień. Kolejność wyświetlania:
1. **Dzisiaj** — zawsze na samej górze, wyróżniony pomarańczowym obramowaniem i etykietą „dziś" z datą
2. Kolejne dni tygodnia (przyszłe) — w naturalnej kolejności
3. Minione dni tygodnia — na dole, domyślnie zwinięte

---

## 3. Karty dni tygodnia

Każda karta dnia zawiera:

- **Nazwę dnia** i **datę** (np. „Czwartek 25.06")
- Etykietę „dziś" przy bieżącym dniu lub „miniony" przy dniach, które już upłynęły
- **Znacznik ukończenia** — ikona zielonego znacznika pojawia się przy dniu, gdy wszystkie treningi tego dnia są odhaczone
- **Przycisk +** — otwiera formularz dodawania treningu do tego konkretnego dnia
- **Listę treningów** — karty poszczególnych treningów przypisanych do danego dnia

### Puste dni
Jeśli dzień nie ma żadnych treningów, wyświetlany jest komunikat „Brak zaplanowanych treningów" oraz przycisk „Zaplanuj trening".

### Zwijanie minionych dni
Dni, które już minęły (np. w czwartek — poniedziałek, wtorek, środa), są domyślnie zwinięte. W zwiniętym widoku widoczna jest tylko nazwa, data i lista nazw treningów w jednej linii. Kliknięcie strzałki ↓/↑ (lub kliknięcie w nagłówek dnia) rozwija lub zwija jego zawartość.

---

## 4. Karty treningów

Każdy trening wyświetlany jest jako osobna karta wewnątrz dnia. Karta zawiera:

### Checkbox „Wykonane"
Okrągłe pole wyboru po lewej stronie. Kliknięcie w nie oznacza trening jako ukończony:
- nazwa treningu zostaje przekreślona i szara,
- karta wizualnie wyszarzeje,
- licznik postępu tygodnia zwiększa się o 1.

Ponowne kliknięcie cofa oznaczenie.

### Kolorowy pasek boczny
Każdy typ treningu ma swój kolor paska po lewej stronie karty:
| Typ treningu       | Kolor paska | Kolor etykiety |
|--------------------|-------------|----------------|
| Bieg               | Czerwony    | Czerwony       |
| Siła               | Czarny      | Czarny         |
| Joga / Rozciąganie | Zielony     | Zielony        |
| Zabawa biegowa     | Czerwony    | Czerwony       |
| Rower              | Fioletowy   | Fioletowy      |
| Inne               | Szary       | Szary          |

### Etykieta (badge) z typem treningu
Kolorowa naklejka z ikoną i nazwą typu, np. 🏃 Bieg lub 💪 Siła.

### Nazwa treningu
Pogrubiony tekst — np. „Bieg 5 km" lub „Trening siłowy — nogi".

### Opis (opcjonalny)
Mniejszy tekst pod nazwą — dodatkowe informacje, np. trasa, tempo, plan ćwiczeń.

### Przycisk „+ Dodaj uwagi"
Kliknięcie otwiera pole tekstowe, w którym można wpisać notatki po treningu, np. „Szybciej niż poprzednio, czułam się świetnie".

### Przycisk „Głosowo" (notatka głosowa)
Pojawia się przy każdej karcie (jeśli przeglądarka obsługuje nagrywanie). Po kliknięciu:
1. Aplikacja pyta o dostęp do mikrofonu (jednorazowo, za pierwszym razem).
2. Przycisk zmienia się na „Słucham..." i pulsuje.
3. Użytkownik mówi po polsku — aplikacja transkrybuje mowę na tekst.
4. Tekst zostaje dopisany do pola uwag.

> Funkcja głosowa działa w przeglądarkach Chrome i Edge. W Safari może być niedostępna.

### Przycisk usuwania (ikona kosza)
Usuwa trening bezpowrotnie. Na komputerze pojawia się po najechaniu myszką, na telefonie zawsze widoczny.

---

## 5. Dodawanie treningu

### Przez przycisk + przy dniu
Kliknięcie „+" przy wybranym dniu otwiera okno dialogowe z formularzem:

| Pole              | Opis                                                              |
|-------------------|-------------------------------------------------------------------|
| **Typ treningu**  | Lista rozwijana z 6 opcjami (patrz sekcja 8)                     |
| **Nazwa**         | Pole tekstowe — domyślnie uzupełniane na podstawie wybranego typu |
| **Opis**          | Opcjonalne pole tekstowe — szczegóły treningu                     |

Po kliknięciu „Dodaj trening" trening pojawia się w wybranym dniu.

### Przez przycisk „Zaplanuj trening" w pustym dniu
Działa identycznie jak „+".

---

## 6. Niezaplanowany trening

Przycisk **„Niezaplanowany"** w nagłówku służy do szybkiego zapisania treningu, który użytkownik wykonał spontanicznie — bez wcześniejszego planowania.

Formularz wygląda jak standardowy formularz dodawania, ale zawiera dodatkowe pole **„Dzień tygodnia"** — użytkownik sam wybiera, do którego dnia chce przypisać ten trening.

---

## 7. Import planu z tekstu

Przycisk **„Wklej plan"** otwiera duże pole tekstowe, do którego można wkleić plan tygodniowy napisany w naturalnym języku.

### Format wejściowy
Każda linia to jeden dzień, w formacie:
```
Poniedziałek: bieg 5 km
Wtorek: trening siłowy
Środa: wolne
Czwartek: joga 30 minut
Piątek: rower
Sobota: zabawa biegowa z dziećmi
Niedziela: odpoczynek
```

### Logika rozpoznawania
Aplikacja analizuje każdą linię tekstu:

1. **Rozpoznaje dzień tygodnia** — na początku linii szuka nazwy dnia (obsługuje polskie znaki i warianty bez nich, np. „sroda" zamiast „środa").
2. **Wydziela opis** — tekst po dwukropku lub myślniku traktuje jako nazwę treningu.
3. **Rozpoznaje typ treningu** na podstawie słów kluczowych:
   - „bieg", „jogging", „run" → Bieg
   - „rower", „jazda", „bike", „cycling" → Rower
   - „joga", „yoga", „rozciąg", „stretching" → Joga/Rozciąganie
   - „zabawa bieg", „bieg zabaw" → Zabawa biegowa
   - „siła", „siłow", „gym", „wagi", „weights" → Siła
   - „wolne", „odpoczynek", „rest" → linia pomijana (brak treningu)
   - wszystko inne → Inne
4. **Tworzy treningi** — dodaje je do odpowiednich dni.
5. **Nie usuwa istniejących treningów** — import tylko dopisuje nowe.

Po imporcie pojawia się komunikat z liczbą dodanych treningów.

---

## 8. Typy treningów

Aplikacja obsługuje sześć typów treningów:

| Typ               | Ikona | Kolor       | Słowa kluczowe w imporcie              |
|-------------------|-------|-------------|----------------------------------------|
| Siła              | 💪   | Czarny      | siła, siłowy, gym, wagi                |
| Joga/Rozciąganie  | 🧘   | Zielony     | joga, rozciąganie, yoga, stretching    |
| Bieg              | 🏃   | Czerwony    | bieg, run, jogging                     |
| Zabawa biegowa    | ⚽   | Czerwony    | zabawa bieg, fun run                   |
| Rower             | 🚴   | Fioletowy   | rower, rowerek, jazda, cycling, bike   |
| Inne              | ⚡   | Szary       | wszystko pozostałe                     |

---

## 9. Pasek postępu — szczegółowa logika

- Pasek złożony z **7 segmentów** jest zawsze widoczny (nawet gdy nie ma żadnych treningów).
- **Każde odhaczenie treningu** (checkbox „Wykonane") zwiększa licznik o 1.
- Maksymalna wartość to **7** — niezależnie od liczby dodanych treningów.
- Cofnięcie odhaczenia zmniejsza licznik o 1.
- Gdy licznik osiągnie 7/7, pojawia się link „Tydzień ukończony — dodaj refleksję".

---

## 10. Refleksja tygodniowa

Gdy użytkownik ukończy 7 treningów (pasek osiągnie 7/7), automatycznie pojawia się okno dialogowe z trzema pytaniami:

1. **Z czego jestem zadowolona w tym tygodniu?**
2. **Co było dla mnie trudne?**
3. **Na czym chcę się skupić w przyszłym tygodniu?**

### Opcje w oknie refleksji
- **Zapisz refleksję** — zapisuje odpowiedzi i zamyka okno. Odpowiedzi będą widoczne w historii.
- **Pomiń** — zamyka okno bez zapisywania. Refleksję można dodać później, klikając link pod paskiem postępu.

### Gdzie widać refleksję?
Po zapisaniu refleksji:
- Pod paskiem postępu pojawia się zielona informacja: „✓ Refleksja tygodnia zapisana".
- Pełna treść refleksji widoczna jest w zakładce **Historia** po archiwizacji tygodnia.

---

## 11. Nowy tydzień — archiwizacja

Przycisk **„Nowy tydzień"** (widoczny w nagłówku, gdy istnieją treningi) służy do zakończenia bieżącego tygodnia i rozpoczęcia nowego.

### Co się dzieje po kliknięciu?
1. Aplikacja wyświetla komunikat potwierdzający decyzję.
2. Po potwierdzeniu: wszystkie treningi bieżącego tygodnia (wraz z zapisaną refleksją) trafiają do **Historii**.
3. Bieżący widok tygodnia jest czyszczony — gotowy do planowania nowego tygodnia.
4. Pasek postępu resetuje się do 0/7.

> Jeśli użytkownik nie potwierdzi — nic się nie zmienia.

---

## 12. Historia — zakładka

Zakładka **Historia** (dostępna przez kliknięcie w górnym menu) przechowuje archiwum wszystkich poprzednich tygodni.

### Co widać w historii?
Lista kart — po jednej na każdy zarchiwizowany tydzień. Nagłówek każdej karty zawiera:
- **Zakres dat tygodnia** — np. „22.06 – 28.06"
- **Statystykę ukończenia** — np. „5/7 treningów ukończonych"
- Informację o refleksji — „· z refleksją" jeśli refleksja została zapisana

### Rozwijanie wpisu historii
Kliknięcie w kartę tygodnia rozwija szczegóły:
- **Lista treningów według dni** — ze znacznikiem ukończenia (✓ lub ○) i ewentualnymi uwagami
- **Refleksja tygodnia** (jeśli była zapisana) — żółte pole z trzema odpowiedziami

### Pusta historia
Jeśli użytkownik nigdy nie kliknął „Nowy tydzień", zakładka Historia jest pusta z komunikatem wyjaśniającym.

---

## 13. Działanie na telefonie

Aplikacja jest w pełni responsywna — dostosowuje się do rozmiaru ekranu.

Na telefonie:
- Dni wyświetlane są jeden pod drugim (przewijanie pionowe)
- Przyciski są odpowiednio duże dla wygody dotykania
- Ikona kosza przy treningu jest zawsze widoczna (nie wymaga najechania)
- Przycisk głosowy działa tak samo jak na komputerze

---

## 14. Prywatność i przechowywanie danych

Dane użytkownika nigdy **nie opuszczają urządzenia**. Aplikacja nie ma serwera, nie wymaga internetu po pierwszym załadowaniu i nie wysyła żadnych informacji zewnętrznych.

Dane przechowywane lokalnie:
| Klucz w pamięci           | Zawartość                                      |
|---------------------------|------------------------------------------------|
| `planer-treningow`        | Lista treningów bieżącego tygodnia             |
| `planer-historia`         | Lista zarchiwizowanych tygodni                 |
| `planer-refleksja`        | Refleksja bieżącego tygodnia (jeśli zapisana)  |
| `planer-reflection-count` | Licznik do jednorazowego wyświetlania refleksji|

**Uwaga:** Wyczyszczenie danych przeglądania (historia, pliki cookie i dane witryn) w ustawieniach przeglądarki spowoduje trwałe usunięcie wszystkich danych aplikacji.

---

## 15. Ograniczenia aplikacji

- **Jedno urządzenie, jedna przeglądarka** — dane nie synchronizują się między telefonem a komputerem.
- **Brak konta** — nie ma możliwości odzysku danych po wyczyszczeniu przeglądarki.
- **Notatki głosowe** — wymagają przeglądarki Chrome lub Edge; Safari nie jest wspierane.
- **Brak powiadomień** — aplikacja nie wysyła przypomnień o treningu.
- **Jeden tydzień jednocześnie** — aplikacja planuje zawsze bieżący tydzień; nie można z góry planować przyszłych tygodni.

---

## 16. Słowniczek

| Pojęcie            | Znaczenie                                                                 |
|--------------------|---------------------------------------------------------------------------|
| localStorage       | Pamięć wbudowana w przeglądarkę — jak schowek tylko dla tej aplikacji     |
| Checkbox           | Pole do zaznaczenia (kwadrat lub kółko) oznaczające „zrobione"            |
| Badge / etykieta   | Kolorowa naklejka z nazwą i ikoną pokazująca typ treningu                 |
| Pasek postępu      | Wizualna belka z 7 segmentami pokazująca postęp w tygodniu                |
| Import             | Wczytanie gotowego planu z wklejonego tekstu                              |
| Archiwizacja       | Przeniesienie zakończonego tygodnia do historii                           |
| Refleksja          | Krótkie podsumowanie tygodnia odpowiadające na 3 pytania                  |
