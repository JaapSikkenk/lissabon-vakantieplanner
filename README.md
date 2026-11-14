# Lissabon Vakantieplanner (PWA)

Een mobiele webapp voor 23 t/m 29 november 2026.

## Functies
- Bezienswaardighedencatalogus met indicatieve bezoektijden en wijkfilters.
- Weekplanning in tijdsloten van 30 minuten (08:00–23:00).
- Activiteiten toevoegen, verwijderen en verplaatsen.
- Desktop: sleep activiteiten naar een ander tijdslot.
- Mobiel: tik op **＋ Plan**, kies dag en begintijd.
- Eigen activiteiten toevoegen (bijv. lunch, reistijd of rust).
- Planning wordt lokaal op het apparaat bewaard.
- Export naar een tekstbestand.
- Offline beschikbaar nadat de app een keer online is geopend en gecachet.

## Publiceren
Een PWA moet via HTTPS worden aangeboden (of lokaal via localhost). Upload de volledige inhoud van deze map naar een statische hostingdienst, bijvoorbeeld GitHub Pages, Netlify of Cloudflare Pages. Er is geen backend of database nodig.

1. Upload alle bestanden en de map `icons`.
2. Schakel HTTPS in.
3. Open de URL in Chrome op Android.
4. Kies in Chrome-menu **Toevoegen aan startscherm** of gebruik de knop **Installeren** als die verschijnt.

## Privacy en opslag
De planning wordt alleen in de lokale opslag van de browser op dit apparaat opgeslagen. Wissen van browsergegevens kan de planning verwijderen. Er is geen synchronisatie tussen apparaten.

## Let op
Bezoektijden zijn richtlijnen. Controleer actuele openingstijden, sluitingsdagen, tickets en eventuele reserveringsplicht vóór vertrek. De lijst bevat een dubbele tegelmuseumvermelding (historische/alternatieve naam) die je desgewenst kunt verwijderen of samenvoegen.

## Versie 3.0
- Interactieve OpenStreetMap-kaart met alle bezienswaardigheden.
- Dagfilter met routevolgorde en knop om de dagroute in Google Maps te openen.
- Automatisch dagvoorstel met aankomst op maandagavond, vijf themadagen en een vrije zondag.
- Per verplaatsing tussen twee bezienswaardigheden directe routeopties in Google Maps: lopen, taxi/auto en openbaar vervoer. Google Maps toont de actuele geschatte reistijd en route.
- De kaart en routeopties gebruiken internet; de planning blijft lokaal opgeslagen.
- Kaartpinnen zijn benaderende locaties; de stippellijn is een volgorde-indicatie, geen berekende wandelroute.


## Reistijden
De app vraagt geen betaalde route-API aan. Daarom opent elke vervoersoptie Google Maps, waar de actuele route en reistijd voor lopen, taxi/auto of OV worden berekend. De app verzint dus geen reistijden op basis van hemelsbrede afstanden.
