import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, 
  Upload, 
  Settings, 
  Image as ImageIcon, 
  Type, 
  Maximize, 
  RefreshCcw,
  Sparkles,
  CheckCircle,
  Bold,
  Box,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Layers
} from 'lucide-react';
import { FontOption, FrameSettings, A4_RATIO } from './types';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const App: React.FC = () => {
  const [imageList, setImageList] = useState<{img: HTMLImageElement, name: string}[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [settings, setSettings] = useState<FrameSettings>({
    lineThickness: 2,
    marginMm: 15,
    text: 'A Beautiful Memory',
    fontFamily: FontOption.SERIF,
    fontSize: 24,
    textColor: '#000000',
    lineColor: '#000000',
    isBold: false,
    isRounded: false,
    cornerRadiusMm: 10
  });
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants for high-quality rendering (300 DPI)
  const DPI = 300;
  const MM_INCH = 25.4;
  const A4_WIDTH_PX = Math.round((210 / MM_INCH) * DPI);
  const A4_HEIGHT_PX = Math.round((297 / MM_INCH) * DPI);

  const currentImage = imageList[selectedIndex]?.img || null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: {img: HTMLImageElement, name: string}[] = [];
    let loadedCount = 0;

    // Fix: Explicitly cast Array.from(files) to File[] to avoid unknown type errors on properties like 'name' and when passing to reader.readAsDataURL
    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          newImages.push({ img, name: file.name.split('.')[0] });
          loadedCount++;
          if (loadedCount === files.length) {
            setImageList(prev => [...prev, ...newImages]);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageList(prev => {
      const newList = prev.filter((_, i) => i !== index);
      if (selectedIndex >= newList.length) {
        setSelectedIndex(Math.max(0, newList.length - 1));
      }
      return newList;
    });
  };

  const generateAICaption = async () => {
    if (!currentImage) return;
    setIsGeneratingCaption(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Suggest a short, elegant 1-3 word title for this photo suitable for a framed print. Output only the words." },
              { inlineData: { mimeType: 'image/jpeg', data: currentImage.src.split(',')[1] } }
            ]
          }
        ]
      });
      const text = response.text;
      if (text) {
        setSettings(prev => ({ ...prev, text: text.trim() }));
      }
    } catch (err) {
      console.error("Failed to generate AI caption", err);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const drawOnContext = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement | null) => {
    const width = A4_WIDTH_PX;
    const height = A4_HEIGHT_PX;

    // 1. Fill Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw the Image
    if (img) {
      const imgRatio = img.height / img.width;
      let drawW, drawH;
      
      if (imgRatio > A4_RATIO) {
        drawH = height;
        drawW = height / imgRatio;
      } else {
        drawW = width;
        drawH = width * imgRatio;
      }
      
      const x = (width - drawW) / 2;
      const y = (height - drawH) / 2;
      ctx.drawImage(img, x, y, drawW, drawH);
    }

    // 3. Prepare Border & Text
    const pxPerMm = DPI / MM_INCH;
    const marginPx = settings.marginMm * pxPerMm;
    const thicknessPx = settings.lineThickness * (DPI / 96);
    const radiusPx = settings.isRounded ? settings.cornerRadiusMm * pxPerMm : 0;
    
    const rectX = marginPx;
    const rectY = marginPx;
    const rectW = width - (marginPx * 2);
    const rectH = height - (marginPx * 2);

    ctx.font = `${settings.isBold ? 'bold ' : ''}${settings.fontSize * (DPI / 72)}px ${settings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const textWidth = settings.text ? ctx.measureText(settings.text).width : 0;
    const textX = width / 2;
    const textY = rectY + rectH; 

    // 4. Draw the Border
    ctx.strokeStyle = settings.lineColor;
    ctx.lineWidth = thicknessPx;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 10;

    const gap = settings.text ? (textWidth * 1.1) : 0; 

    ctx.beginPath();
    ctx.moveTo(textX + gap/2, rectY + rectH);
    ctx.arcTo(rectX + rectW, rectY + rectH, rectX + rectW, rectY, radiusPx);
    ctx.arcTo(rectX + rectW, rectY, rectX, rectY, radiusPx);
    ctx.arcTo(rectX, rectY, rectX, rectY + rectH, radiusPx);
    ctx.arcTo(rectX, rectY + rectH, rectX + rectW, rectY + rectH, radiusPx);
    ctx.lineTo(textX - gap/2, rectY + rectH);
    ctx.stroke();

    // 5. Draw the Text
    if (settings.text) {
      ctx.fillStyle = settings.textColor;
      ctx.fillText(settings.text, textX, textY);
    }
  }, [settings, A4_WIDTH_PX, A4_HEIGHT_PX]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = A4_WIDTH_PX;
    canvas.height = A4_HEIGHT_PX;
    drawOnContext(ctx, currentImage);
  }, [currentImage, drawOnContext, A4_WIDTH_PX, A4_HEIGHT_PX]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const saveSingle = (imgSource: HTMLImageElement | null, fileName: string) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = A4_WIDTH_PX;
    offscreen.height = A4_HEIGHT_PX;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    
    drawOnContext(ctx, imgSource);
    
    const link = document.createElement('a');
    link.download = `${fileName}-framed.png`;
    link.href = offscreen.toDataURL('image/png', 1.0);
    link.click();
  };

  const saveBulk = async () => {
    if (imageList.length === 0) return;
    setIsProcessingBulk(true);
    
    for (let i = 0; i < imageList.length; i++) {
      const item = imageList[i];
      saveSingle(item.img, item.name);
      // Brief delay to prevent browser download blocking
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsProcessingBulk(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-100 font-sans">
      {/* Sidebar Controls */}
      <aside className="w-full lg:w-96 bg-white border-r border-slate-200 overflow-y-auto p-6 flex-shrink-0 shadow-xl z-20">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Maximize size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">A4 Framer</h1>
          </div>
          <button 
            onClick={drawCanvas}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
            title="Refresh Canvas"
          >
            <RefreshCcw size={18} />
          </button>
        </header>

        <div className="space-y-8">
          {/* Section 1: Image Source & Bulk Gallery */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ImageIcon size={14} /> 1. Photos ({imageList.length})
            </h3>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex flex-col items-center gap-2 group mb-4"
            >
              <Upload size={24} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 uppercase tracking-tight">
                Add Image(s) in Bulk
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />

            {imageList.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                {imageList.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    <img src={item.img.src} alt="" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-0.5 right-0.5 p-1 bg-white/80 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Text Caption */}
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Type size={14} /> 2. Caption Text
            </h3>
            <div className="space-y-2">
              <div className="relative">
                <input 
                  type="text" 
                  value={settings.text}
                  onChange={(e) => setSettings({...settings, text: e.target.value})}
                  placeholder="Enter caption text..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm outline-none font-medium shadow-sm"
                />
                {currentImage && (
                  <button 
                    onClick={generateAICaption}
                    disabled={isGeneratingCaption}
                    className="absolute right-2 top-2 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    title="AI Magic Suggestion"
                  >
                    <Sparkles size={16} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Captions are shared across all bulk images.</p>
            </div>
          </section>

          {/* Section 3: Frame Parameters */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Settings size={14} /> 3. Global Styling
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <label>Line Distance (Margin mm)</label>
                <span className="text-indigo-600 font-mono">{settings.marginMm}mm</span>
              </div>
              <input 
                type="range" min="0" max="80" step="1" 
                value={settings.marginMm}
                onChange={(e) => setSettings({...settings, marginMm: Number(e.target.value)})}
                className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <label>Line Thickness (px)</label>
                <span className="text-indigo-600 font-mono">{settings.lineThickness}px</span>
              </div>
              <input 
                type="range" min="0" max="25" step="0.5" 
                value={settings.lineThickness}
                onChange={(e) => setSettings({...settings, lineThickness: Number(e.target.value)})}
                className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Corner Rounding Controls */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box size={14} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-600 uppercase">Rounded Corners</span>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, isRounded: !prev.isRounded }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.isRounded ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.isRounded ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              
              <div className={`space-y-2 transition-opacity duration-200 ${settings.isRounded ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <label>Corner Radius (mm)</label>
                  <span className="text-indigo-600 font-mono">{settings.cornerRadiusMm}mm</span>
                </div>
                <input 
                  type="range" min="0" max="50" step="1" 
                  disabled={!settings.isRounded}
                  value={settings.cornerRadiusMm}
                  onChange={(e) => setSettings({...settings, cornerRadiusMm: Number(e.target.value)})}
                  className="w-full accent-indigo-600 h-1 bg-white border border-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest">Font Family</label>
                <select 
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({...settings, fontFamily: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value={FontOption.SERIF}>Classic Serif</option>
                  <option value={FontOption.SANS_SERIF}>Modern Sans</option>
                  <option value={FontOption.GARAMOND}>Garamond</option>
                  <option value={FontOption.MONTSERRAT}>Montserrat</option>
                  <option value={FontOption.LATO}>Lato</option>
                  <option value={FontOption.MONO}>Monospace</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest">Font Options</label>
                <div className="flex gap-2">
                  <select 
                    value={settings.fontSize}
                    onChange={(e) => setSettings({...settings, fontSize: Number(e.target.value)})}
                    className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    {[12, 16, 20, 24, 28, 32, 40, 48, 64].map(size => (
                      <option key={size} value={size}>{size}pt</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, isBold: !prev.isBold }))}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-center ${settings.isBold ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    title="Bold Text"
                  >
                    <Bold size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest">Line Color</label>
                <input 
                  type="color" 
                  value={settings.lineColor}
                  onChange={(e) => setSettings({...settings, lineColor: e.target.value})}
                  className="w-full h-10 rounded-lg cursor-pointer border-2 border-slate-100 p-0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest">Text Color</label>
                <input 
                  type="color" 
                  value={settings.textColor}
                  onChange={(e) => setSettings({...settings, textColor: e.target.value})}
                  className="w-full h-10 rounded-lg cursor-pointer border-2 border-slate-100 p-0.5"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
          <button 
            onClick={() => saveSingle(currentImage, imageList[selectedIndex]?.name || 'print')}
            disabled={!currentImage || isProcessingBulk}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-black disabled:bg-slate-200 text-white font-bold py-3 rounded-xl transition-all text-sm group"
          >
            <Download size={18} />
            Save Current Image
          </button>
          
          <button 
            onClick={saveBulk}
            disabled={imageList.length === 0 || isProcessingBulk}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.97] text-base group"
          >
            <Layers size={20} className={isProcessingBulk ? 'animate-bounce' : ''} />
            {isProcessingBulk ? `Processing ${imageList.length}...` : `Download All (${imageList.length})`}
          </button>
          
          <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <CheckCircle size={10} className="text-green-500" />
            Print Ready • 300 DPI A4
          </div>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-auto">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200 shadow-sm z-10 flex items-center gap-3">
           <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
           <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Live Composition Preview</span>
        </div>

        {/* Batch Navigation */}
        {imageList.length > 1 && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
            <button 
              onClick={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
              disabled={selectedIndex === 0}
              className="p-2 bg-white border border-slate-200 rounded-full shadow-md hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="bg-white/90 px-4 py-1.5 rounded-full text-xs font-black border border-slate-200 shadow-sm">
              {selectedIndex + 1} / {imageList.length}
            </span>
            <button 
              onClick={() => setSelectedIndex(prev => Math.min(imageList.length - 1, prev + 1))}
              disabled={selectedIndex === imageList.length - 1}
              className="p-2 bg-white border border-slate-200 rounded-full shadow-md hover:text-indigo-600 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-6 max-w-full max-h-full">
          <div className="relative group perspective-1000 w-full flex items-center justify-center">
            {/* Realistic Paper Frame */}
            <div className="relative bg-white shadow-[0_30px_60px_rgba(0,0,0,0.12)] rounded-[1px] border border-slate-200 overflow-hidden flex items-center justify-center" 
                 style={{ 
                   aspectRatio: `210 / 297`, 
                   maxHeight: '75vh',
                   maxWidth: '100%' 
                 }}>
              {!currentImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 p-12 text-center pointer-events-none">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                    <ImageIcon size={48} className="opacity-20 text-indigo-900" />
                  </div>
                  <h4 className="text-xl font-black text-slate-500 mb-2 uppercase tracking-tight">Bulk Composition</h4>
                  <p className="text-sm max-w-[280px] font-medium leading-relaxed text-slate-400">Upload one or multiple photos to begin your batch print composition.</p>
                </div>
              )}
              <canvas 
                ref={canvasRef} 
                className="w-full h-full object-contain block"
                style={{ imageRendering: 'auto' }}
                title="A4 Design Preview"
              />
            </div>
          </div>
          
          {currentImage && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                A4 Format: 210mm × 297mm • 300 DPI
              </p>
              <p className="text-[10px] font-medium text-slate-300 truncate max-w-[200px]">
                {imageList[selectedIndex]?.name}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;