# Stefan Tirozzi – Budget 2027

Statischer Budgetplan für das iPhone. Keine Benutzerkonten und keine Datenbank. Budgetwerte werden mit einem gemeinsamen Passwort verschlüsselt. Das Repository enthält nur Programmcode und eine leere Vorlage.

Web Crypto: PBKDF2-SHA-256 mit 600.000 Iterationen, zufälligem Salt und AES-256-GCM mit neuem IV pro Speicherung. Der Schlüssel und das Passwort bleiben im Arbeitsspeicher des Browsers. Lokale Budgetstände, Sicherungsdateien und Einrichtungslinks sind verschlüsselt. Änderungen werden nicht zwischen Geräten synchronisiert.
