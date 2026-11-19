"""Produit les voix françaises du jeu à partir de voicegen/script.json.
Moteur : Piper (synthèse neuronale hors ligne). Sortie : public/audio/fr/<dossier>/<id>.mp3
+ public/audio/audio_manifest.json.  Usage : python3 voicegen/generate.py [--voices DIR] [--only id,id]"""
import json, os, sys, subprocess, wave, argparse, hashlib
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

ap = argparse.ArgumentParser()
ap.add_argument('--voices', default=os.environ.get('PIPER_VOICES', '/home/claude/voices-src/wp/voices'))
ap.add_argument('--only', default='')
args = ap.parse_args()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio')
TMP = os.path.join(ROOT, 'voicegen', 'wav')
os.makedirs(TMP, exist_ok=True)

# Distribution des voix — une voix distincte par personnage.
CAST = {
    'narratrice':  dict(model='fr_FR-siwis-medium', speaker=None, length=1.10, noise=0.60, noise_w=0.75, pause=0.35, desc='voix féminine claire et posée (siwis)'),
    'joseph':      dict(model='fr_FR-tom-medium',   speaker=None, length=1.25, noise=0.75, noise_w=0.85, pause=0.25, desc='voix masculine jeune adulte (tom)'),
    'policier':    dict(model='fr_FR-upmc-medium',  speaker=1,    length=1.12, noise=0.60, noise_w=0.70, pause=0.35, pitch=0.915, desc='voix masculine plus grave et posée (upmc « pierre », abaissée d’environ 1,5 demi-ton)'),
    'responsable': dict(model='fr_FR-upmc-medium',  speaker=1,    length=0.95, noise=0.70, noise_w=0.85, pause=0.25, pitch=1.09, desc='voix masculine pressée, entendue au téléphone (upmc « pierre », relevée d’environ 1,5 demi-ton, filtre téléphone)'),
}
FILTERS = {
    # nettoyage commun : coupe-bas, silence de tête/queue limité, volume homogène (EBU R128, -18 LUFS)
    'base': 'highpass=f=70,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse,loudnorm=I=-18:TP=-2:LRA=9',
    'phone': 'highpass=f=320,lowpass=f=3400,acompressor=threshold=-20dB:ratio=3,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse,loudnorm=I=-18:TP=-2:LRA=7',
}

# Phrases denses que le modèle lit trop vite : on les ralentit un peu plus.
SLOWER = {'04b-narratrice-04': 1.2, '08-fiche-04': 1.3, 'fin-a-retenir-03': 1.2, '05-policier-03': 1.15}
script = json.load(open(os.path.join(ROOT, 'voicegen', 'script.json')))
only = set(filter(None, args.only.split(',')))
loaded = {}
manifest = []
for it in script:
    c = dict(CAST[it['role']])
    if it['id'] in SLOWER: c['length'] = round(c['length'] * SLOWER[it['id']], 3)
    rel = f"fr/{it['folder']}/{it['id']}.mp3"
    dst = os.path.join(OUT, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    key = hashlib.sha1(json.dumps([it['tts'], c], sort_keys=True).encode()).hexdigest()[:12]
    stamp = os.path.join(ROOT, 'voicegen', 'stamps', it['id']); os.makedirs(os.path.dirname(stamp), exist_ok=True)
    if (not only or it['id'] in only) and not (os.path.exists(dst) and os.path.exists(stamp) and open(stamp).read() == key and not only):
        if c['model'] not in loaded: loaded[c['model']] = PiperVoice.load(os.path.join(args.voices, c['model'] + '.onnx'))
        v = loaded[c['model']]
        cfg = SynthesisConfig(speaker_id=c['speaker'], length_scale=c['length'], noise_scale=c['noise'], noise_w_scale=c['noise_w'])
        sr = v.config.sample_rate
        chunks = []
        for ch in v.synthesize(it['tts'], cfg):
            chunks.append(np.frombuffer(ch.audio_int16_bytes, dtype=np.int16))
            chunks.append(np.zeros(int(sr * c['pause']), dtype=np.int16))
        audio = np.concatenate(chunks[:-1])
        wav = os.path.join(TMP, it['id'] + '.wav')
        with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(audio.tobytes())
        af = FILTERS['phone' if it['role'] == 'responsable' else 'base']
        if c.get('pitch'): af = f"rubberband=pitch={c['pitch']}:formant=preserved," + af
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', af + ',apad=pad_dur=0.12', '-ar', '44100', '-ac', '1',
                        '-c:a', 'libmp3lame', '-b:a', '80k', '-id3v2_version', '3',
                        '-metadata', f"title={it['text'][:120]}", '-metadata', f"artist={it['character']}", dst], check=True)
        open(stamp, 'w').write(key)
        print('✓', rel, flush=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout)
    manifest.append({'id': it['id'], 'character': it['character'], 'voice': it['role'], 'scene': it['scene'], 'text': it['text'],
                     'spoken': it['tts'] if it['tts'] != it['text'] else None, 'path': 'audio/' + rel, 'duration': round(dur, 2)})

json.dump({'language': 'fr', 'generator': 'Piper (synthèse neuronale hors ligne)', 'voices': {k: v['desc'] for k, v in CAST.items()},
           'count': len(manifest), 'items': manifest}, open(os.path.join(OUT, 'audio_manifest.json'), 'w'), ensure_ascii=False, indent=1)
print(len(manifest), 'entrées →', 'public/audio/audio_manifest.json')
