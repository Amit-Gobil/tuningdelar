import { COMPANY_NAME, SITE_NAME, TERMS_VERSION } from '@/lib/config';

export const metadata = { title: 'Villkor' };

const ORG_NR = '559324-3065';
const CONTACT_EMAIL = 'info@kingkongtuning.se';

function Section({ n, title, children }) {
  return (
    <section>
      <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text)' }}>{n}. {title}</h2>
      {children}
    </section>
  );
}

const P = ({ children }) => <p style={{ margin: 0 }}>{children}</p>;

export default function Terms() {
  return (
    <div className="wrap" style={{ maxWidth: 760, paddingTop: 40 }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>Villkor</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 28 }}>Version {TERMS_VERSION}</p>
      <div className="stack" style={{ gap: 22, lineHeight: 1.7, color: 'var(--text-2)', fontSize: 16 }}>
        <Section n={1} title="Om tjänsten">
          <P>
            {SITE_NAME} drivs av {COMPANY_NAME}, org.nr {ORG_NR}. På sajten kan privatpersoner och företag sälja och köpa bildelar och bilar, antingen via auktion eller till fast pris (köp direkt). Köpet sker direkt mellan köpare och säljare. {COMPANY_NAME} är inte part i köpet, utom när {COMPANY_NAME} själv är säljare. Kontakt:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--text)', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>.
          </P>
        </Section>
        <Section n={2} title="Konto och identifiering">
          <P>Du loggar in med BankID. Ditt namn och personnummer sparas och kopplas till dina annonser, bud och köp. Andra användare ser bara ditt förnamn. Ditt personnummer visas aldrig för andra.</P>
        </Section>
        <Section n={3} title="Bindande bud och köp">
          <P>Ett lagt bud kan inte dras tillbaka. Har du högsta budet när en auktion avslutas, och har ett eventuellt reservationspris uppnåtts, förbinder du dig att köpa till det beloppet. Ett köp via köp direkt är bindande så fort du bekräftat det.</P>
        </Section>
        <Section n={4} title="Säljarens ansvar">
          <P>Säljaren ansvarar för att annonsen är korrekt, att varan finns och får säljas, och för att beskriva kända fel. Säljaren får inte buda på sin egen annons eller låta någon annan driva upp priset.</P>
        </Section>
        <Section n={5} title="Auktioner">
          <P>Bud strax före sluttiden kan förlänga auktionen, enligt vad som anges i annonsen. Säljaren kan ha satt ett dolt reservationspris. Uppnås det inte är säljaren inte skyldig att sälja. Sajtens servertid gäller.</P>
        </Section>
        <Section n={6} title="Betalning och leverans">
          <P>Köpare och säljare kommer själva överens om betalning, frakt eller upphämtning via meddelandefunktionen. Om inget annat avtalats ska betalning ske senast 3 dagar efter avslutat köp. Var försiktig: betala inte innan du är säker på att varan finns.</P>
        </Section>
        <Section n={7} title="Om köpet inte fullföljs">
          <P>Fullföljer köparen inte köpet i tid har säljaren rätt att häva köpet och erbjuda varan till näst högsta budgivare. När {COMPANY_NAME} är säljare ska den som inte fullföljer sitt vinnande bud betala en avgift på 5 000 kr till {COMPANY_NAME}. Användare som inte fullföljer sina köp kan stängas av.</P>
        </Section>
        <Section n={8} title="Personuppgifter">
          <P>
            {COMPANY_NAME} är personuppgiftsansvarig. Namn och personnummer från BankID, kontaktuppgifter du själv anger samt uppgifter om annonser, bud, köp och meddelanden sparas för att driva tjänsten och kunna visa vem som gjort vad. Personnummer lagras krypterat. Kontaktuppgifter delas bara med den du gjort en affär med. Begär utdrag eller radering via{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--text)', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>.
          </P>
        </Section>
      </div>
    </div>
  );
}
