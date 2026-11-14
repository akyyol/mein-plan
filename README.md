# Mein Plan

Statischer Budget- und Zahlungsplan für das iPhone, mit getrennten Planjahren von 2027 bis 2080. Keine Benutzerkonten und keine Datenbank. Budgetwerte werden mit einem gemeinsamen Passwort verschlüsselt. Das Repository enthält Programmcode, eine leere Vorlage und die bereits vor Veröffentlichung verschlüsselte Ausgangsdatei. Es enthält weder das Passwort noch persönliche Budgetwerte im Klartext.

Web Crypto: PBKDF2-SHA-256 mit 600.000 Iterationen, zufälligem Salt und AES-256-GCM mit neuem IV pro Speicherung. Der Schlüssel und das Passwort bleiben im Arbeitsspeicher des Browsers. Lokale Budgetstände, Sicherungsdateien und Einrichtungslinks sind verschlüsselt. Änderungen werden nicht zwischen Geräten synchronisiert.

Rechnungen zählen in voller Höhe am Fälligkeitstag. Wiederkehrende Zahlungen folgen dem eingetragenen Rhythmus bis zum optionalen Enddatum. Der Kontostand gilt zu Tagesbeginn des erfassten Datums; frühere Buchungen werden nicht erneut gerechnet. Die Vorschau zeigt Monatsendstände und den tiefsten Tagesendstand. Buchungen am gleichen Tag werden zusammengezählt. Verbrauchsposten wie Rauchen und Benzin sind ausdrücklich gekennzeichnete Schätzungen.

Kategorien und Einträge sind editierbar. Gelöschte Einträge bleiben im verschlüsselten Papierkorb wiederherstellbar. Neue Jahre können laufende Einträge übernehmen; der Anfangskontostand muss neu angegeben werden. Einmalzahlungen und ausdrücklich abgelaufene Verträge werden nicht wiederholt.

Bestehende verschlüsselte Daten und Sicherungen der ersten Version werden beim Öffnen migriert. Die bisherige Speicherkennung und das Verschlüsselungsprotokoll bleiben zur Kompatibilität erhalten. Vor der ersten Umstellung wird der alte verschlüsselte Stand zusätzlich im Browser gesichert. Übernommene Monatstermine werden als zu prüfen markiert. Die Sicherung kann unter «Sichern» heruntergeladen werden.

Lokal starten: `python -m http.server 8788 --bind 127.0.0.1`. Die Web-Crypto-API benötigt HTTPS oder localhost. Es werden keine externen Schriften, Skripte oder Analysedienste geladen.
