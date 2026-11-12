// Vocabolario comune degli agenti: contiene solo ciò che il motore di montaggio sa fare.
// Quando il motore impara un effetto nuovo, lo si aggiunge qui e gli agenti possono usarlo.

export const LOOK_COLORE = {
  caldo_cinematico: 'toni caldi, ombre morbide, leggera grana, contrasto medio',
  pulito_commerciale: 'bianchi puliti, colori fedeli, contrasto alto, nitido',
  teal_orange: 'pelle calda, ombre e cieli verso il ciano, look da film',
  moody_scuro: 'sottoesposto, colori desaturati, neri profondi',
  naturale_vivace: 'colori saturi ma naturali, luminoso, estivo',
  bn_contrasto: 'bianco e nero contrastato',
  pastello_soft: 'colori pastello, alte luci morbide, poco contrasto',
  vintage_film: 'neri sollevati, dominante calda, grana pellicola',
};

export const EFFETTI = {
  punch_in: 'zoom secco del 10-20% sul taglio o sull\'accento',
  zoom_lento: 'zoom progressivo durante l\'inquadratura',
  speed_ramp: 'accelerazione/rallenty dentro la stessa clip',
  rallenty: 'clip rallentata (fluida solo se girata a 50/60 fps)',
  whip_pan: 'transizione a frusta con mosso direzionale',
  flash_bianco: 'lampo bianco di 2-4 fotogrammi sul taglio',
  shake: 'tremolio di camera sull\'impatto',
  light_leak: 'bagliore di luce in sovrapposizione',
  glitch: 'distorsione digitale breve',
  split_screen: 'schermo diviso in 2-3 riquadri',
  freeze_frame: 'fermo immagine con testo',
  dissolvenza: 'dissolvenza incrociata',
  taglio_netto: 'taglio secco senza transizione',
  bande_cinema: 'bande nere orizzontali (look cinema)',
  grana: 'grana pellicola',
  vignettatura: 'bordi scuriti',
};

export const STILI_TESTO = {
  titolo_grande_centrale: 'parole grandi al centro, 1-4 parole per schermata',
  parola_per_parola: 'sottotitoli che compaiono una parola alla volta',
  karaoke_evidenziato: 'frase intera, parola pronunciata evidenziata',
  sottotitolo_classico: '1-2 righe in basso, sobrio',
  etichetta_box: 'testo dentro un box colorato',
  nessun_testo: 'nessun testo a schermo',
};

export const POSIZIONI = ['alto', 'centro', 'terzo_inferiore'];
export const MOOD = ['energico', 'elegante', 'emozionale', 'divertente', 'lusso', 'urbano_hiphop', 'acustico_caldo', 'elettronico', 'epico', 'chill'];

export function libreriaTesto() {
  const r = ['LOOK COLORE:'];
  for (const [k, v] of Object.entries(LOOK_COLORE)) r.push(`- ${k}: ${v}`);
  r.push('\nEFFETTI E TRANSIZIONI:');
  for (const [k, v] of Object.entries(EFFETTI)) r.push(`- ${k}: ${v}`);
  r.push('\nSTILI TESTO:');
  for (const [k, v] of Object.entries(STILI_TESTO)) r.push(`- ${k}: ${v}`);
  r.push(`\nPOSIZIONI TESTO: ${POSIZIONI.join(', ')}`);
  r.push(`MOOD MUSICA: ${MOOD.join(', ')}`);
  return r.join('\n');
}
