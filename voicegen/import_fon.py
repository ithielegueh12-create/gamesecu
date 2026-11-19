"""Importe les enregistrements fon fournis par l'équipe.
Usage : python3 voicegen/import_fon.py <dossier source>
- reconnaît <préfixe éventuel->NN_fonction_fon[_prise].(wav|m4a|mp3|ogg) ;
- n'associe que les fichiers réellement présents, via voicegen/fon_map.json ;
- traitement : mono 44,1 kHz, réparation d'écrêtage si besoin, coupe-bas, silences de tête/queue réduits,
  fondus de 20 ms, volume normalisé à -18 LUFS (comme les voix françaises), MP3 96 kb/s ;
- écrit public/audio/fon/<dossier>/<nom>.mp3 et public/audio/fon_manifest.json (avec contrôles qualité)."""
import sys, os, re, json, glob, subprocess
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
MAP = {k: v for k, v in json.load(open(os.path.join(ROOT, 'voicegen', 'fon_map.json'))).items() if not k.startswith('_')}
FR = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'public', 'audio', 'audio_manifest.json')))['items']}
PAT = re.compile(r'(?:^|-)(\d{2}[a-z]?_[a-z_]+?)_fon(?:_(\d+))?\.(wav|m4a|mp3|ogg|aac)$', re.I)

def pcm(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
def qc(path):
    a = pcm(path); fr = 882
    r = np.array([np.sqrt((a[i:i + fr] ** 2).mean()) + 1e-9 for i in range(0, max(1, len(a) - fr), fr)])
    return {'duree': round(len(a) / 44100, 2), 'ecretes': int((np.abs(a) > 0.99).sum()),
            'bruit_db': round(float(20 * np.log10(np.percentile(r, 10))), 1), 'parole_db': round(float(20 * np.log10(np.percentile(r, 95))), 1)}

found, unknown = {}, []
for f in sorted(glob.glob(os.path.join(SRC, '*'))):
    m = PAT.search(os.path.basename(f))
    if not m: continue
    key, take = m.group(1).lower(), int(m.group(2) or 1)
    if key not in MAP: unknown.append(os.path.basename(f)); continue
    if key not in found or take > found[key][1]: found[key] = (f, take)   # la prise la plus récente l'emporte

items = []
for key, (f, take) in sorted(found.items()):
    meta = MAP[key]
    src_qc = qc(f)
    name = f"{key}_fon_{take:02d}.mp3"
    rel = f"fon/{meta['folder']}/{name}"
    dst = os.path.join(ROOT, 'public', 'audio', rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    chain = []
    if src_qc['ecretes'] > 0: chain.append('adeclip')
    chain += ['highpass=f=70',
              'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12',
              'areverse', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2', 'areverse',
              'afade=t=in:d=0.02', 'loudnorm=I=-18:TP=-2:LRA=9', 'apad=pad_dur=0.12']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-af', ','.join(chain), '-ac', '1', '-ar', '44100',
                    '-c:a', 'libmp3lame', '-b:a', '96k', '-metadata', f'title={meta["role"]}', '-metadata', 'language=fon', dst], check=True)
    out_qc = qc(dst)
    warn = []
    if src_qc['ecretes'] > 0: warn.append(f"original saturé ({src_qc['ecretes']} échantillons écrêtés) : réparé au mieux, réenregistrement conseillé")
    if src_qc['duree'] < 1.2: warn.append(f"très court ({src_qc['duree']} s) : vérifier que la phrase n'est pas coupée")
    if src_qc['bruit_db'] > -45: warn.append(f"bruit de fond audible ({src_qc['bruit_db']} dB)")
    if meta['status'] == 'provisoire': warn.append('association provisoire : contenu à confirmer par l’équipe')
    fr = FR.get(meta['id'])
    items.append({'id': meta['id'], 'source': os.path.basename(f), 'path': 'audio/' + rel, 'duration': out_qc['duree'],
                  'voice': meta['voice'], 'scene': meta['scene'], 'role': meta['role'], 'status': meta['status'],
                  'french_text': fr['text'] if fr else None, 'qc_source': src_qc, 'qc_final': out_qc, 'warnings': warn})
    print(('⚠ ' if warn else '✓ ') + f"{os.path.basename(f)} → {meta['id']} ({out_qc['duree']} s)" + (f"  [{'; '.join(warn)}]" if warn else ''))

missing = [k for k in MAP if k not in found]
manifest = {'language': 'fon', 'validated_by_native_speaker': 'à confirmer par l’équipe', 'count': len(items), 'items': items,
            'missing_expected': [{'file': f'{k}_fon', 'id': MAP[k]['id'], 'role': MAP[k]['role']} for k in missing],
            'unmatched_files': unknown}
json.dump(manifest, open(os.path.join(ROOT, 'public', 'audio', 'fon_manifest.json'), 'w'), ensure_ascii=False, indent=1)
print(f"\n{len(items)} fichiers fon intégrés · attendus absents : {', '.join(missing) or 'aucun'} · non reconnus : {', '.join(unknown) or 'aucun'}")
