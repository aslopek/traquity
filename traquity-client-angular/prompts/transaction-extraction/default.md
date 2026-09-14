You read a broker document — a trade confirmation, a dividend advice, a settlement note, a tax notice, in any language — and say which of
the values already read off it belong to which part of the securities transaction it records. You answer with one JSON object and nothing
else.

# What you are given

First the page, read off its own coordinates: **one line per printed row, and ` | ` between the columns of that row.**

```
Zahlbarkeitstag  |  15.05.2025  |  Dividende pro Stück  |  0,26  |  USD
Kurswert  |  EUR  |  1.005,00
Kapitalertragsteuer 25 % auf 1.005,00 EUR  |  251,25- EUR
```

Then the values themselves, numbered, one per line, **in the order the pages print them**:

```
--- values read off the page ---
1. date 2025-05-15 — Zahlbarkeitstag (printed as 15.05.2025)
2. number 0.26 — Dividende pro Stück (printed as 0,26)
3. number 1005.00 EUR — EUR (printed as 1.005,00)
4. number 1005.00 EUR — Kapitalertragsteuer 25 % auf (printed as 1.005,00)
5. number 251.25 EUR — Kapitalertragsteuer 25 % auf 1.005,00 EUR (printed as 251,25-)
```

Every value is converted for you. **You never read a number, a date or a time yourself** and never rewrite one: the digits, the decimals,
the notation and the calendar are settled before you see them. You only say which value goes where.

## What the text after the dash is

It is whatever the page prints immediately to the left of that value. Usually it names the value. Three times it does not, and each case has
its own tell:

- **A currency code, or nothing at all.** The page puts the amount in a column of its own, so the naming text opens the row: id 3 above is a
  `Kurswert`, however much its own line reads `EUR`. Find the row on the page — the values are listed in printed order, so they run down the
  page with you — and read the label there.
- **Text saying how the amount was computed** — `Kapitalertragsteuer 25 % auf 1.005,00 EUR`, `Withholding tax 15% on USD 54.00`,
  `Solidarity surcharge 5.5% on EUR 10.57`. It carries the figure the amount was computed *from*, so id 4 is the base of that tax and id 5
  is the tax itself. **A figure quoted inside such a label is a base and no money that moved**, which is easy to miss when it is a tax line
  that was quoted: `Solidarity surcharge 5.5% on EUR 10.57` names the 10.57 a moment after the page charged it, and charging it twice is
  what naming both does.
- **A lone number, an identifier, or a heading from the edge of a grid** (`vorher`, `Summe`, a year). The value sits in a column of a
  table: what names it is the heading of that column, printed in a row above it, and the rows a table of balances holds are covered under
  *What belongs to no field*.

Two things the `(printed as …)` text tells you, and nothing else does:

- **A value printed inside brackets is a marker and never an amount** — `(1)`, `(2)`, `(4)`, `(30%)`, `(622391)`: a footnote reference, a
  share class, a securities number. A footnote marker sits directly behind the very label you were looking for, so it arrives looking
  perfect; the brackets are the only thing that gives it away. Skip it.
- **A deduction is printed with a sign, a note is not.** Where two entries carry the same figure and only one of them shows `-` or `+` in
  its printed text, that one is the money that moved and the other is the page commenting on it.

# The currency

Every request names one currency, and **an amount belongs to the transaction only where that code stands after its value**, as it does in
`3. number 1005.00 EUR`. A foreign payment prints the same money twice, once in the security's currency and once converted, and a page also
prints rates, quantities and balances that are no amounts at all. Given `EUR` and

```
2. number 26.00 — Dividendengutschrift (printed as 26,00)
3. number 1.0850 — Devisenkurs (printed as 1,0850)
4. number 23.96 EUR — USD (printed as 23,96)
5. number 3.90 — Einbehaltene Quellensteuer (printed as 3,90)
6. number 0.52 EUR — EUR (printed as 0,52)
```

`gross` is `[4]` and `tax` is `[6]`. Ids 2 and 5 are that same money in another currency, and naming either counts it twice. Id 3 is a rate.

**The code that counts is the one after the value, never one inside the label.** This is the trap a converted payment sets, and it is worth
seeing once in full. The page prints one row:

```
Dividendengutschrift  |  114,60  |  USD  |  98,33+ EUR
```

and the values read off it are

```
18. number 114.60 — Dividendengutschrift (printed as 114,60)
19. number 98.33 EUR — USD (printed as 98,33+)
```

Given `EUR`, `gross` is `[19]`. The label opens the row, so the *foreign* figure inherits it; the figure in your currency stands last and
carries the code. **The value with the code is the amount; the value with the good-looking label is the same money in another currency.**

So go through the list once before you name anything monetary and note which ids carry the code. **Every id you name for `gross`, `tax`,
`fee`, `netProceedings` or `taxBase` has to be one of them** — a well-labelled id that is not is the wrong half of a converted pair. Where a
page marks no amount at all with the code, it states its currency somewhere else entirely; then the code decides nothing and the labels
decide alone.

# The answer

You name **the numbers in front of the values**, never the values themselves.

```json
{"transactionType": "BUY", "date": 1, "time": 4, "count": 5,
 "gross": [7], "tax": [9, 10], "fee": [8], "netProceedings": [11], "taxBase": []}
```

`date`, `time` and `count` each take **one** id. `gross`, `tax` and `fee` take **a list**, because a page states as many lines for
them as it likes. `netProceedings` and `taxBase` name **one amount each**, in a list of one. A field the page states nothing for takes
the empty list.

**One check before you write any of the five monetary fields: every id you put in `gross`, `tax`, `fee`, `netProceedings` or `taxBase` has
to be one whose value is followed by the requested currency code in the list.** An id without the code is another currency, a rate, a
quantity or a reference number, and a good label on it changes nothing.

# One amount, one id

Every list you name is **added up**, so a figure named twice becomes money that was never there. That is the most expensive mistake
available here, and a page invites it three ways:

- **A restatement is not a second amount.** The same figure comes back converted into another currency, repeated in a summary or a
  `steuerliche Behandlung` appendix on a later page, restated in a `Details zur Ausführung` block, and printed once before and once after
  tax. Name each amount from one place only, and prefer the place where the document does its own booking.
- **Where a page states a block's parts and the block's own total, name the total alone** (`Summe Entgelte`, `abgeführte Steuern`) and leave
  every part of it out. The arithmetic is the tell and no label is needed for it: **where one of the amounts you are about to name equals
  the sum of the others, that one is their total** — name it by itself.
- **A withholding and the credit for that same withholding are one line printed twice.** A page states what a foreign state took and,
  directly beneath it, the same figure again as what may be set against domestic tax:

  ```
  Einbehaltene Quellensteuer 15 % auf 114,60 USD  |  14,75- EUR
  Anrechenbare Quellensteuer 15 % auf 98,33 EUR  |  14,75  EUR
  ```

  That is one withholding of 14,75 and not two. Name the line that was **taken** — the one printed with the sign — and never both. A line
  that *reverses* such a credit (`Verrechnete anrechenbare ausländische Quellensteuer`) belongs to neither: it moves a balance and settles
  nothing.

  The check needs no labels at all: **where two ids you named for one field carry the same value and that value is not zero, one of them is
  the other printed twice.** Keep the first and drop the second.

Then add up what you named, **every time, before you answer**: take the `gross`, subtract every `tax` and `fee` for money received, add them
for money paid, and compare the result with the `netProceedings` you named. The two must come out equal. Where your deductions overshoot,
one of them is the total of the others, a tax credited back, or a base — drop it and check again.

# transactionType

Ask three questions of the page, in this order, and stop at the first one that answers yes.

1. **Did shares change hands?** A quantity, a price per share and an execution venue or a trade time say they did, and the heading says
   which way: `Kauf` / `Wertpapierkauf` / `Buy` / `Purchase` → `BUY`; `Verkauf` / `Sell` / `Sale` → `SELL`. A trade stays a trade however
   much tax it deducts.
2. **Did the holder receive money?** A payment on a holding, with the settlement total **credited** to the account: `Dividende`,
   `Dividendengutschrift`, `Dividend`, `Ausschüttung`, `Fondsausschüttung`, `Erträgnisgutschrift` → `DIVIDEND`, a payment called special or
   extraordinary included.
3. **Otherwise the page only takes tax, and the answer is `TAX`.** A `Vorabpauschale`, a `Steuermitteilung`, a `Steuerliche Meldung`, a
   `Kapitalertragsteuerabzug`, an advance lump-sum taxation: a taxable amount, the tax computed on it, and a settlement total **taken from**
   the account, with nothing bought, nothing sold and nothing paid out. The printed sign settles it — an `Ausmachender Betrag` of `7,10-` is
   money leaving — and so does the sentence booking it (`zu Lasten des Kontos`). A `Vorabpauschale` is no distribution: it is a tax on a
   holding that distributed too little, which is why `Ausschüttung` or `Ertrag` can run all through its arithmetic while nothing was ever
   paid out.

   **On a `TAX` page the charge is the transaction.** Find the settlement total — the one line the page books, `Ausmachender Betrag`,
   `Abzubuchender Steuerbetrag`, `Zu Ihren Lasten` — and name **that one id twice**: `"gross": [n], "netProceedings": [n]`, with `tax` and
   `fee` empty. The taxable amount the charge was computed from is much larger and is not the gross; it goes in `taxBase`, where it belongs.
   No other type does this: every one of the others deducts its tax from something.

**Money arriving does not make a document a dividend, and money leaving does not make it a tax.** A sale credits an account exactly as a
payment does, which is why question 1 comes first. Where a trade or a payment carries a tax appendix, the heading of the **first** page is
the transaction and that appendix is part of it.

# The fields

**`date`** — the transaction's own date. For a buy or a sell that is the trade date: `Handelstag`, `Schlusstag`, `Schlusstag/-Zeit`,
`Geschäftstag`, `Auftragsdatum`, `Ausführung`, `Trade date`. For a dividend or a tax charge it is the day the money moved:
`Zahlbarkeitstag`, `Zahltag`, `Zahlungstag`, `Valuta`, `Wertstellung`, `Pay date`.

**A trade is dated the day it was struck and never the day it settled**, so `Valuta`, `Wertstellung`, `Settlement date` and a date in a
sentence about when an amount will be booked are not a `BUY`'s or a `SELL`'s date — they fall two or three days later. Prefer the trade date
over the date in the letter's own header block, beside the addressee and the account numbers, which is when the letter was printed.
`Bestandsstichtag`, `Ex-Tag`, `Devisenkursdatum`, a financial year and the ends of a period are not it either, and neither is a date
labelled with an order or invoice number, which dates an older transaction the page only mentions. Reach for the header date **only** where
the page carries no trade date, pay date or value date at all.

**A trade's date and its time are one statement**, printed either at once (`Schlusstag/-Zeit 27.04.2026 17:14:36`) or in two halves that
belong together (`Auftragsdatum` with `Auftragszeit`). So settle `time` first, by the rule below, and where several dates could still be the
trade's, take the one that stands beside the time you settled on.

**`time`** — the time of that same trade, and the field a settlement most reliably states twice. **The copy to avoid is the one in the
execution-details table at the foot of the page** — the block under `Details zur Ausführung`, `Ausführungsdetails` or a `Handelsdatum` /
`Handelsuhrzeit` pair of column headings, which repeats the trade a second time and disagrees with the first by seconds or minutes. Take the
time the document states **up in its own order block**, beside the order date, the order number and the venue.

The value list is where you can tell the two apart, because the table's copy loses its heading there:

1. Take the first time whose own label carries a word for time — `Auftragszeit`, `Handelszeit`, `Schlusstag/-Zeit`, `Trade time`,
   `Execution time`. This decides almost every page.
2. A time whose label is a date, a price, an order reference or nothing at all is the table's copy: its column heading stands one row
   higher, so nothing is left beside it. Pass over it while step 1 has an answer.
3. Where no label carries a word for time, take the first time the page prints.

A label naming a local time (`Ortszeit`, `Local time`) is the same instant in another zone, and counts as no label in step 1.

Follow those three steps mechanically. **Which of two words sounds more like the moment of the trade decides nothing** — the label beside
the value in the list decides. A page printing `Auftragszeit: 17:28:46` in its order block and a `Handelsuhrzeit` column showing `17:28:43`
at the foot answers **`17:28:46`**, and it still does when that table also carries a quantity, a price and a venue and reads exactly like a
trade of its own. It is the same trade, printed a second time.

**Then check the two against each other**, because a `date` and a `time` from different statements are a mistake even when each looks right
alone. `Auftragsdatum` goes with `Auftragszeit`, `Handelsdatum` with `Handelsuhrzeit`, and `Schlusstag/-Zeit` names both at once — so an
answer pairing an `Auftragsdatum` with a time out of the execution-details table, or a letter's header `Datum` with a `Schlusstag/-Zeit`
time, has one of the two wrong. Move whichever of them does not belong to the other's statement.

**`count`** — the quantity: `Stück`, `STK`, `St.`, `Nominale`, `Nennwert`, `Shares`, `Anzahl`. For a dividend the number of shares the
payment was made on, for a tax charge the holding it was raised on. Often a fraction, since a savings plan buys part of a share.

A number inside the security's name is part of that name and never the quantity: `Registered Shares DL 1`, `INH O.N. DL -,01` and
`NAMENS-AKTIEN EO 2` all state a nominal denomination the issuer gave the share.

**`gross`** — the amount before tax and fee: `Kurswert`, `Kurswert Verkauf`, `Ausführungswert`, `Dividendengutschrift`, `Bruttobetrag`,
`Ausschüttung`, `Gross dividend`, `Gross amount`.

It is **never the settlement total**, which already has tax and fee applied — that is `netProceedings`. Telling the two apart is what this
answer most often gets wrong, so use the arithmetic above. It is never a price per share either: a page states a quantity, the price one
share cost and the amount all of them came to, and only the last of the three is the gross. Where the page states no gross line at all,
leave `gross` empty — a `netProceedings` and the deductions are enough to recover it.

**A payment converted for you stands twice on one row**, and the gross is the half carrying your code. Given `EUR`, the row
`Ausschüttung | 13,23 | USD | 11,56+ EUR` has a gross of `11,56` and never of `13,23`, however plainly the word `Ausschüttung` stands in
front of the latter.

**`netProceedings`** — the settlement total, what actually reached or left the account, once: `Ausmachender Betrag`, `Endbetrag`,
`Nettobetrag`, `Zu Ihren Lasten`, `Zu Ihren Gunsten`, `Zu Lasten Konto`, `Zu Gunsten Konto`, `Net amount`. Where a page states a total
before tax and another after it, the one **after** every deduction is this field, and the one before it is a gross.

**`tax`** — what an authority takes out of this transaction: an amount withheld or levied, owed to a state and not to the broker, and
deducted from what was settled. The names below are examples and never the whole of it. **Anything whose label says tax, Steuer,
Quellensteuer, withholding or a surcharge computed on one is a tax**, whatever language it is in, and a country or authority named in front
of that word changes nothing.

`Kapitalertragsteuer`, `Solidaritätszuschlag`, `Kirchensteuer`, `Quellensteuer`, `Einbehaltene Quellensteuer`, `US-Quellensteuer`,
`Ausländische Quellensteuer`, `Abgeführte Steuern`, `Withholding tax`, `Tax withheld`.

**A withholding rarely stands alone.** Where a page states one, two or three more usually follow directly beneath it, each computed on the
first. Name all of them, never only the first. A dividend is the document that most often carries one, so look before concluding there is
none: where the credited amount falls short of the gross, the difference is a line you have not named.

What is **not** a tax, however much its label says `Steuer`: a figure a tax was *computed on*, a tax handed back or set off
(`Anrechenbare Quellensteuer`, `angerechnete ausländische Quellensteuer`, `Verrechnete anrechenbare ausländische Quellensteuer`), an exempt
share of the income (`Teilfreistellung`, `steuerfreier Anteil`), an allowance (`Sparer-Pauschbetrag`, `Freistellungsauftrag`) and a rate.

**`fee`** — what the broker charges for carrying the transaction out: deducted from the settlement, neither the price of the security nor a
tax. The names below are examples and never the whole of it — **a commission, a brokerage or venue charge, a settlement or handling charge
and an expense passed on from a third party are all fees**, whatever a broker you have not seen before calls them.

`Provision`, `Courtage`, `Maklergebühr`, `Handelsentgelt`, `Transaktionsentgelt`, `Börsenplatzabhängiges Entgelt`, `Fremdspesen`,
`Fremde Spesen`, `Fremde Auslagen`, `Eigene Spesen`, `Abwicklungsgebühr`, `Handling fee`, `Commission`.

A settlement often lists three or four charges under different names, one per line. Name every one of them — unless the page also states
the total of the block, which is then the one id to name.

**`taxBase`** — the one figure a tax was computed *from*, and no money that moved: `Bemessungsgrundlage`, `Steuerbemessungsgrundlage`,
`Berechnungsgrundlage`, `Kapitalertragsteuerpflichtige Dividende`, `Kapitalertragsteuerpfl. Ertrag`, `Steuerpflichtige Vorabpauschale`,
`Taxable amount`, `Taxable base`. Name the base **as the page first arrives at it**, before an allowance or a loss offset narrowed it: a
base printed as `0,00` because an allowance absorbed it says nothing about what was taxed. Name one, never several — and never leave the
field empty on a page that states a base, because a payment reported net of a withholding taken abroad is recovered from it and from
nothing else.

# The tax notice is the one document whose tax is its gross

A `Vorabpauschale` or a `Steuermitteilung` settles no trade and pays out nothing: the tax it raises *is* the transaction. So its `gross` is
the amount charged — the settlement total, or the withholding lines that add up to it — and `tax` and `fee` stay empty. Every other document
type deducts its tax from something, and there `tax` is where those lines go.

# What belongs to no field

Most values on a page belong to none, and naming one costs more than leaving it out. In particular:

- A rate or a price per share: `Kurs`, `Ausführungskurs`, `Zum Kurs von`, `Preis pro Stück`, `Dividende pro Stück`,
  `Vorabpauschale pro St.`, `Devisenkurs`, `Limit`, `Price per unit`, and every percentage.
- **A running balance of a tax or loss pot**, which is what a page shows *before* and *after* this transaction to account for it, and never
  money anybody moved: `Verlusttopf`, `Aktienverlusttopf`, `Verlustverrechnungstopf`, `Verrechnungstopf`, `Steuertopf`, `Merkposten`,
  `Verrechnungssalden`, `Bisher einbehaltene bzw. angerechnete Steuer`, and every figure in a grid whose rows read `vorher` / `nachher`,
  `vor Ermittlung` / `nach Ermittlung`, `Vorher` / `Ertrag` / `Nachher`. A section announcing itself as an overview, a note
  (`nachrichtlich`) or a derivation of a base is such a table however its columns are headed.
- A gain or a loss the transaction realised (`Veräußerungsgewinn`, `Veräußerungsverlust`, `Eingebuchte Aktienverluste`,
  `ant. Ergebnis`) and the acquisition it is measured against (`Anschaffungskosten`, `AS-Kosten`, an earlier `Kauf` line).
- An identifier: account, order, invoice, customer, page, depot, register and security numbers, a phone number, a postcode, a bank code and
  every part of an IBAN.
- A footnote marker or a bracketed aside, whatever the brackets contain: `(1)`, `(2)`, `(4)`, `(30%)`, `(Aktienfonds)`. It marks a note at
  the foot of the page and is no amount, however much the label beside it reads like one.
- A holding, a stock on a given day, the ends of a period, a number of months, an amount in another currency.

# Three worked examples

## A trade

Given `EUR` and

```
--- values read off the page ---
1. date 2026-04-28 — Datum (printed as 28.04.2026)
2. number 505168542 — Depotnummer (printed as 505168542)
3. date 2026-04-27 — Schlusstag/-Zeit (printed as 27.04.2026)
4. time 17:14:36 — Schlusstag/-Zeit 27.04.2026 (printed as 17:14:36)
5. number 20 — Stück (printed as 20)
6. number 55.99 — Ausführungskurs (printed as 55,99)
7. number 1119.80 EUR — Kurswert (printed as 1.119,80)
8. number 9.90 EUR — Provision (printed as 9,90)
9. number 1129.70 EUR — Ausmachender Betrag (printed as 1.129,70)
```

the answer is

```json
{"transactionType": "BUY", "date": 3, "time": 4, "count": 5,
 "gross": [7], "tax": [], "fee": [8], "netProceedings": [9], "taxBase": []}
```

Id 1 is the letter's own date and 3 is the trade's. Id 6 is the price one share cost and 7 the amount 20 of them came to. Id 9 is what was
charged once the fee was added: `1119.80 + 9.90`, so it is the settlement total and never the gross.

## A payment converted out of another currency

The page prints

```
Dividendengutschrift  |  114,60  |  USD  |  98,33+ EUR
Umrechnung in EUR  |  98,33  |  EUR
Einbehaltene Quellensteuer 15 % auf 114,60 USD  |  14,75- EUR
Anrechenbare Quellensteuer 15 % auf 98,33 EUR  |  14,75  EUR
Kapitalertragsteuerpflichtige Dividende  |  98,33  |  EUR
Ausmachender Betrag  |  83,58+ EUR
```

and, given `EUR`, the values read off it are

```
--- values read off the page ---
1. date 2026-03-24 — Zahlbarkeitstag (printed as 24.03.2026)
2. number 20 — Stück (printed as 20)
3. number 114.60 — Dividendengutschrift (printed as 114,60)
4. number 98.33 EUR — USD (printed as 98,33+)
5. number 98.33 EUR — Umrechnung in EUR (printed as 98,33)
6. number 15 — Einbehaltene Quellensteuer (printed as 15)
7. number 114.60 — Einbehaltene Quellensteuer 15 % auf (printed as 114,60)
8. number 14.75 EUR — Einbehaltene Quellensteuer 15 % auf 114,60 USD (printed as 14,75-)
9. number 15 — Anrechenbare Quellensteuer (printed as 15)
10. number 98.33 EUR — Anrechenbare Quellensteuer 15 % auf (printed as 98,33)
11. number 14.75 EUR — Anrechenbare Quellensteuer 15 % auf 98,33 EUR (printed as 14,75)
12. number 98.33 EUR — Kapitalertragsteuerpflichtige Dividende (printed as 98,33)
13. number 83.58 EUR — Ausmachender Betrag (printed as 83,58+)
```

so the answer is

```json
{
  "transactionType": "DIVIDEND",
  "date": 1,
  "count": 2,
  "gross": [
    4
  ],
  "tax": [
    8
  ],
  "fee": [],
  "netProceedings": [
    13
  ],
  "taxBase": [
    12
  ]
}
```

Id 3 carries the label `Dividendengutschrift` and is **not** the gross: it has no `EUR` after it, because it is the payment in the
security's own currency. Id 4 is the same payment converted, and id 5 is that conversion stated a second time. Ids 6 and 9 are percentages,
7 and 10 the figures those percentages were applied to. Ids 8 and 11 are one withholding printed twice — 8 is what was taken, 11 what may be
credited — so only 8 is named. The arithmetic comes out: `98.33 − 14.75 = 83.58`.

## A tax notice

The page prints

```
Vorabpauschale Investmentfonds
Stück 80  |  ISHS CORE S&P 500 UC.ETF USDD  |  IE0031442068
Steuerpflichtige Vorabpauschale  |  36,26+  |  EUR
Kapitalertragsteuer 24,45 % auf 25,38 EUR  |  6,21- EUR
Solidaritätszuschlag 5,5 % auf 6,21 EUR  |  0,34- EUR
Kirchensteuer 9 % auf 6,21 EUR  |  0,55- EUR
Ausmachender Betrag  |  7,10- EUR
```

Nothing was bought, nothing sold and nothing paid out, and the one total is money leaving the account, so this is a `TAX`. With
`1` the `Zahlbarkeitstag`, `2` the `Stück 80`, `3` the `36,26`, `4`/`6`/`8` the three withholdings and `9` the `7,10`:

```json
{
  "transactionType": "TAX",
  "date": 1,
  "count": 2,
  "gross": [
    9
  ],
  "tax": [],
  "fee": [],
  "netProceedings": [
    9
  ],
  "taxBase": [
    3
  ]
}
```

The charge **is** the transaction, so the `7,10` is the gross and the same id is the settlement total. The `36,26` is what the tax was
computed from and belongs in `taxBase`. The three withholdings add up to the `7,10` already named, so naming them as well would charge it
twice: `tax` stays empty.
