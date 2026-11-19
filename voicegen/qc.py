import json, subprocess, re, numpy as np, os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
m=json.load(open(os.path.join(ROOT,'public/audio/audio_manifest.json')))
def pcm(p):
    r=subprocess.run(['ffmpeg','-v','error','-i',p,'-f','s16le','-ac','1','-ar','16000','-'],capture_output=True).stdout
    return np.frombuffer(r,dtype=np.int16).astype(np.float32)
def f0(a,sr=16000):
    fr=640; out=[]
    for i in range(0,len(a)-fr,160):
        x=a[i:i+fr]-a[i:i+fr].mean()
        if np.sqrt((x**2).mean())<300: continue
        c=np.correlate(x,x,'full')[fr-1:]; lo,hi=40,267; k=lo+np.argmax(c[lo:hi])
        if c[k]>0.3*c[0]: out.append(sr/k)
    return np.median(out) if out else 0
rows=[]; bad=[]
for it in m['items']:
    p=os.path.join(ROOT,'public',it['path']); a=pcm(p)
    lu=subprocess.run(['ffmpeg','-v','info','-i',p,'-af','ebur128','-f','null','-'],capture_output=True,text=True).stderr
    I=float(re.findall(r'I:\s+(-?[\d.]+) LUFS',lu)[-1])
    peak=np.abs(a).max()/32768; words=len((it['spoken'] or it['text']).split())
    wpm=words/it['duration']*60
    rows.append((it['voice'],f0(a),I,peak,wpm,it['duration']))
    if peak>0.99 or not -20.5<I<-15.5 or not 100<wpm<200 or it['duration']<0.5: bad.append((it['id'],round(I,1),round(peak,2),round(wpm),it['duration']))
for v in ['narratrice','joseph','policier','responsable']:
    r=np.array([x[1:] for x in rows if x[0]==v])
    print(f"{v:12s} n={len(r):2d} F0≈{np.median(r[:,0]):5.0f} Hz  volume {r[:,1].min():.1f}…{r[:,1].max():.1f} LUFS  crête max {r[:,2].max():.2f}  débit {np.median(r[:,3]):.0f} mots/min  durée {r[:,4].sum():.0f} s")
print('à revoir:', bad)
print('durée totale', round(sum(x[5] for x in rows)),'s ; taille', sum(os.path.getsize(os.path.join(ROOT,'public',i['path'])) for i in m['items'])//1024,'Ko')
