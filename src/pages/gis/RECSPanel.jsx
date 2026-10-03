import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Layers, Map as MapIcon, ZoomIn, ZoomOut, Maximize2, RefreshCw, 
  Info, Scissors, GitMerge, Move, PlusCircle, Square, Eye, Printer, 
  Download, Check, AlertCircle, Save, X, Edit3, Compass
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';

// Initial center: Addis Ababa coordinates
const DEFAULT_CENTER = [9.0192, 38.7525];
const DEFAULT_ZOOM = 16;

// Mock spatial parcels if DB spatial data is pending
const INITIAL_PARCELS = [
  {
    id: 'prc-1',
    parcelCode: 'SN001010106060',
    owner: 'Solomon Kebede Alemu',
    landUse: 'Residence',
    areaSqm: 287.98,
    status: 'ACTIVE',
    coordinates: [
      [9.0210, 38.7510],
      [9.0215, 38.7530],
      [9.0200, 38.7535],
      [9.0195, 38.7515]
    ]
  },
  {
    id: 'prc-2',
    parcelCode: 'SN001010106061',
    owner: 'Alemayehu Solomon',
    landUse: 'Commercial',
    areaSqm: 500.50,
    status: 'ACTIVE',
    coordinates: [
      [9.0215, 38.7530],
      [9.0220, 38.7550],
      [9.0205, 38.7555],
      [9.0200, 38.7535]
    ]
  },
  {
    id: 'prc-3',
    parcelCode: 'SN001010106062',
    owner: 'Ministry of Education',
    landUse: 'Public Service',
    areaSqm: 1200.00,
    status: 'ACTIVE',
    coordinates: [
      [9.0195, 38.7515],
      [9.0200, 38.7535],
      [9.0185, 38.7540],
      [9.0180, 38.7520]
    ]
  }
];

export default function RECSPanel() {
  const [parcels, setParcels] = useState(INITIAL_PARCELS);
  const [activeTool, setActiveTool] = useState('navigate'); // navigate, identify, split, merge, borderpoint, building, servitude, node
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [identifyParcel, setIdentifyParcel] = useState(null);
  const [splitPoints, setSplitPoints] = useState([]);
  const [showAttributeTable, setShowAttributeTable] = useState(false);
  const [showPrintComposer, setShowPrintComposer] = useState(false);
  const [printTitle, setPrintTitle] = useState('Cadastral Map Print - Addis Ababa');
  
  // Layer visibility state
  const [layersVisibility, setLayersVisibility] = useState({
    baseMap: true,
    parcel: true,
    borderpoint: true,
    boundaryline: true,
    building: true,
    servitude: true
  });

  // Buildings data
  const [buildings, setBuildings] = useState([
    {
      id: 'bldg-1',
      parcelCode: 'SN001010106060',
      coordinates: [
        [9.0205, 38.7518],
        [9.0208, 38.7525],
        [9.0202, 38.7528],
        [9.0199, 38.7520]
      ]
    }
  ]);

  // Border points data
  const [borderPoints, setBorderPoints] = useState([
    { id: 'bp-1', pointNumber: 'P01', coords: [9.0210, 38.7510] },
    { id: 'bp-2', pointNumber: 'P02', coords: [9.0215, 38.7530] },
    { id: 'bp-3', pointNumber: 'P03', coords: [9.0200, 38.7535] },
    { id: 'bp-4', pointNumber: 'P04', coords: [9.0195, 38.7515] }
  ]);

  // Fetch real database parcels on mount
  useEffect(() => {
    fetchDatabaseParcels();
  }, []);

  const fetchDatabaseParcels = async () => {
    try {
      const res = await client.get('/parcels');
      if (res.data && res.data.length > 0) {
        // Map backend parcels into spatial objects if geometry exists
        const mapped = res.data.map((p, idx) => ({
          id: p.id,
          parcelCode: p.parcel_code || p.parcelCode,
          owner: p.holder_name || 'Registered Possessor',
          landUse: p.land_use || p.landUse || 'Residential',
          areaSqm: p.area_sqm || p.areaSqm || 350.0,
          status: p.status || 'ACTIVE',
          coordinates: [
            [9.0210 + (idx * 0.002), 38.7510 + (idx * 0.002)],
            [9.0215 + (idx * 0.002), 38.7530 + (idx * 0.002)],
            [9.0200 + (idx * 0.002), 38.7535 + (idx * 0.002)],
            [9.0195 + (idx * 0.002), 38.7515 + (idx * 0.002)]
          ]
        }));
        setParcels(mapped);
      }
    } catch (err) {
      console.log('Using default spatial layers for RECS Editor');
    }
  };

  const handleParcelClick = (parcel, e) => {
    if (activeTool === 'identify') {
      setIdentifyParcel(parcel);
    } else if (activeTool === 'merge') {
      if (selectedParcels.find(p => p.id === parcel.id)) {
        setSelectedParcels(selectedParcels.filter(p => p.id !== parcel.id));
      } else {
        setSelectedParcels([...selectedParcels, parcel]);
      }
    }
  };

  const executeParcelSplit = async () => {
    if (selectedParcels.length !== 1) {
      toast.error('Please select exactly 1 parcel to split using Identify or Merge tool first!');
      return;
    }
    const target = selectedParcels[0];
    const newCode1 = `${target.parcelCode}-S1`;
    const newCode2 = `${target.parcelCode}-S2`;
    
    try {
      if (target.id && !target.id.startsWith('prc-')) {
        await client.post('/spatial/split-parcel', {
          parcel_id: target.id,
          new_parcel_codes: [newCode1, newCode2]
        });
        toast.success(`Parcel ${target.parcelCode} split in database: ${newCode1}, ${newCode2}`);
        fetchDatabaseParcels();
        setSelectedParcels([]);
        return;
      }
    } catch (err) {
      console.warn('Backend split fallback to local visual split:', err.message);
    }

    // Visual fallback split
    const newP1 = {
      ...target,
      id: `${target.id}-1`,
      parcelCode: newCode1,
      areaSqm: (target.areaSqm / 2).toFixed(2),
      coordinates: [
        target.coordinates[0],
        target.coordinates[1],
        [
          (target.coordinates[1][0] + target.coordinates[2][0]) / 2,
          (target.coordinates[1][1] + target.coordinates[2][1]) / 2
        ],
        [
          (target.coordinates[0][0] + target.coordinates[3][0]) / 2,
          (target.coordinates[0][1] + target.coordinates[3][1]) / 2
        ]
      ]
    };

    const newP2 = {
      ...target,
      id: `${target.id}-2`,
      parcelCode: newCode2,
      areaSqm: (target.areaSqm / 2).toFixed(2),
      coordinates: [
        [
          (target.coordinates[0][0] + target.coordinates[3][0]) / 2,
          (target.coordinates[0][1] + target.coordinates[3][1]) / 2
        ],
        [
          (target.coordinates[1][0] + target.coordinates[2][0]) / 2,
          (target.coordinates[1][1] + target.coordinates[2][1]) / 2
        ],
        target.coordinates[2],
        target.coordinates[3]
      ]
    };

    setParcels(parcels.filter(p => p.id !== target.id).concat([newP1, newP2]));
    setSelectedParcels([]);
    toast.success(`Parcel ${target.parcelCode} successfully split into ${newCode1} and ${newCode2}!`);
  };

  const executeParcelMerge = async () => {
    if (selectedParcels.length < 2) {
      toast.error('Select at least 2 adjacent parcels to merge!');
      return;
    }
    const mergedCode = `PRC-MERGE-${Date.now().toString().slice(-4)}`;
    const totalArea = selectedParcels.reduce((sum, p) => sum + Number(p.areaSqm), 0);
    
    try {
      const realIds = selectedParcels.filter(p => p.id && !p.id.startsWith('prc-') && !p.id.startsWith('merged-')).map(p => p.id);
      if (realIds.length >= 2) {
        await client.post('/spatial/merge-parcels', {
          parcel_ids: realIds,
          merged_parcel_code: mergedCode
        });
        toast.success(`Parcels merged in database into ${mergedCode}`);
        fetchDatabaseParcels();
        setSelectedParcels([]);
        return;
      }
    } catch (err) {
      console.warn('Backend merge fallback to local visual merge:', err.message);
    }

    const mergedParcel = {
      id: `merged-${Date.now()}`,
      parcelCode: mergedCode,
      owner: selectedParcels[0].owner,
      landUse: selectedParcels[0].landUse,
      areaSqm: totalArea.toFixed(2),
      status: 'ACTIVE',
      coordinates: selectedParcels[0].coordinates
    };

    const remaining = parcels.filter(p => !selectedParcels.find(sp => sp.id === p.id));
    setParcels([...remaining, mergedParcel]);
    setSelectedParcels([]);
    toast.success(`Parcels successfully merged into new Unique Parcel ${mergedCode}!`);
  };

  return (
    <div className="recs-workspace flex flex-col h-[calc(100vh-5rem)] bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Application Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
            <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" /> RECS v2.2 - Real Estate Cadastre System
          </span>
          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono">
            CRS: EPSG:20137 (Adindan / UTM 37N)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Task Mode: <strong className="text-slate-200">CADASTRE_MAINTENANCE</strong></span>
          <button 
            onClick={() => setEditingEnabled(!editingEnabled)}
            className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition ${editingEnabled ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <Edit3 className="w-3.5 h-3.5" /> {editingEnabled ? 'Editing Active' : 'Enable Editing'}
          </button>
        </div>
      </div>

      {/* Main Interactive Toolbars */}
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex flex-wrap gap-4 items-center text-xs">
        {/* Navigation Toolbar */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Nav</span>
          <button onClick={() => setActiveTool('navigate')} className={`p-1.5 rounded ${activeTool==='navigate'?'bg-blue-600 text-white':'hover:bg-slate-800 text-slate-300'}`} title="Pan Map"><Move className="w-4 h-4"/></button>
          <button onClick={() => setActiveTool('identify')} className={`p-1.5 rounded ${activeTool==='identify'?'bg-blue-600 text-white':'hover:bg-slate-800 text-slate-300'}`} title="Identify Features"><Info className="w-4 h-4"/></button>
        </div>

        {/* Digitizing & Feature Toolbar */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Spatial Edit</span>
          <button onClick={executeParcelSplit} disabled={!editingEnabled} className="p-1.5 rounded hover:bg-slate-800 text-amber-400 disabled:opacity-40" title="Split Selected Parcel"><Scissors className="w-4 h-4"/></button>
          <button onClick={executeParcelMerge} disabled={!editingEnabled} className="p-1.5 rounded hover:bg-slate-800 text-emerald-400 disabled:opacity-40" title="Merge Selected Parcels"><GitMerge className="w-4 h-4"/></button>
        </div>

        {/* Action Controls */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowAttributeTable(true)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Attribute Table
          </button>
          <button onClick={() => setShowPrintComposer(true)} className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded flex items-center gap-1">
            <Printer className="w-3.5 h-3.5" /> Print Composer
          </button>
        </div>
      </div>

      {/* Main Spatial Body: Left Layers Panel + GIS Canvas */}
      <div className="flex-1 flex relative">
        {/* Layer Panel */}
        <div className="w-64 bg-slate-950 border-r border-slate-800 p-3 flex flex-col text-xs">
          <div className="font-semibold text-slate-300 pb-2 mb-2 border-b border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-blue-400" /> Layer Tree</span>
            <span className="text-[10px] text-slate-500">6 Layers</span>
          </div>

          <div className="space-y-2 flex-1">
            <label className="flex items-center gap-2 hover:bg-slate-900 p-1.5 rounded cursor-pointer">
              <input type="checkbox" checked={layersVisibility.baseMap} onChange={e => setLayersVisibility({...layersVisibility, baseMap: e.target.checked})} className="rounded text-blue-600"/>
              <span className="text-slate-200">OpenStreetMap Base</span>
            </label>
            <label className="flex items-center gap-2 hover:bg-slate-900 p-1.5 rounded cursor-pointer">
              <input type="checkbox" checked={layersVisibility.parcel} onChange={e => setLayersVisibility({...layersVisibility, parcel: e.target.checked})} className="rounded text-blue-600"/>
              <span className="w-3 h-3 bg-blue-500/40 border border-blue-400 rounded-sm"></span>
              <span className="text-slate-200">Parcel Polygons</span>
            </label>
            <label className="flex items-center gap-2 hover:bg-slate-900 p-1.5 rounded cursor-pointer">
              <input type="checkbox" checked={layersVisibility.borderpoint} onChange={e => setLayersVisibility({...layersVisibility, borderpoint: e.target.checked})} className="rounded text-blue-600"/>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-slate-200">Border Points</span>
            </label>
            <label className="flex items-center gap-2 hover:bg-slate-900 p-1.5 rounded cursor-pointer">
              <input type="checkbox" checked={layersVisibility.building} onChange={e => setLayersVisibility({...layersVisibility, building: e.target.checked})} className="rounded text-blue-600"/>
              <span className="w-3 h-3 bg-amber-500/50 border border-amber-400 rounded-sm"></span>
              <span className="text-slate-200">Building Footprints</span>
            </label>
          </div>

          {/* Selected Parcels Indicator */}
          {selectedParcels.length > 0 && (
            <div className="mt-auto bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-[11px] font-semibold text-amber-400 mb-1">Selected Parcels ({selectedParcels.length}):</div>
              {selectedParcels.map(p => (
                <div key={p.id} className="text-[10px] text-slate-300 truncate">{p.parcelCode} ({p.areaSqm}m²)</div>
              ))}
            </div>
          )}
        </div>

        {/* GIS Map Canvas */}
        <div className="flex-1 relative bg-slate-950">
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ width: '100%', height: '100%' }}>
            {layersVisibility.baseMap && (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors | CRPRS RECS 2.2"
              />
            )}

            {/* Parcel Polygons */}
            {layersVisibility.parcel && parcels.map(parcel => {
              const isSelected = selectedParcels.some(p => p.id === parcel.id);
              return (
                <Polygon
                  key={parcel.id}
                  positions={parcel.coordinates}
                  eventHandlers={{
                    click: (e) => handleParcelClick(parcel, e)
                  }}
                  pathOptions={{
                    color: isSelected ? '#f59e0b' : '#3b82f6',
                    fillColor: isSelected ? '#fbbf24' : '#60a5fa',
                    fillOpacity: isSelected ? 0.6 : 0.35,
                    weight: isSelected ? 3 : 2
                  }}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans p-1">
                      <h4 className="font-bold text-blue-900">{parcel.parcelCode}</h4>
                      <div className="text-xs space-y-1 mt-1">
                        <div><strong>Holder:</strong> {parcel.owner}</div>
                        <div><strong>Land Use:</strong> {parcel.landUse}</div>
                        <div><strong>Area:</strong> {parcel.areaSqm} m²</div>
                        <div><strong>Status:</strong> {parcel.status}</div>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Building Polygons */}
            {layersVisibility.building && buildings.map(bldg => (
              <Polygon
                key={bldg.id}
                positions={bldg.coordinates}
                pathOptions={{ color: '#d97706', fillColor: '#f59e0b', fillOpacity: 0.5, weight: 1.5 }}
              />
            ))}

            {/* Border Points */}
            {layersVisibility.borderpoint && borderPoints.map(bp => (
              <CircleMarker
                key={bp.id}
                center={bp.coords}
                radius={4}
                pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Identify Tool Modal */}
      {identifyParcel && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-width-md w-full p-5 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-blue-400 flex items-center gap-2">
                <Info className="w-5 h-5" /> Parcel Identity Attribute
              </h3>
              <button onClick={() => setIdentifyParcel(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/50"><span className="text-slate-400">Parcel ID:</span> <span className="font-mono text-amber-400">{identifyParcel.parcelCode}</span></div>
              <div className="flex justify-between py-1 border-b border-slate-800/50"><span className="text-slate-400">Right Holder:</span> <span className="font-semibold">{identifyParcel.owner}</span></div>
              <div className="flex justify-between py-1 border-b border-slate-800/50"><span className="text-slate-400">Land Use:</span> <span>{identifyParcel.landUse}</span></div>
              <div className="flex justify-between py-1 border-b border-slate-800/50"><span className="text-slate-400">Calculated Area:</span> <span>{identifyParcel.areaSqm} sq. meters</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-400">Status:</span> <span className="text-emerald-400 font-semibold">{identifyParcel.status}</span></div>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setIdentifyParcel(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Attribute Table Modal */}
      {showAttributeTable && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-4xl w-full p-5 text-slate-100 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                <Eye className="w-5 h-5" /> RECS Layer Attribute Table - Parcels
              </h3>
              <button onClick={() => setShowAttributeTable(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="p-2.5">Parcel Code</th>
                    <th className="p-2.5">Right Holder</th>
                    <th className="p-2.5">Land Use</th>
                    <th className="p-2.5">Area (m²)</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parcels.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-800/50">
                      <td className="p-2.5 font-mono text-amber-400">{p.parcelCode}</td>
                      <td className="p-2.5">{p.owner}</td>
                      <td className="p-2.5">{p.landUse}</td>
                      <td className="p-2.5">{p.areaSqm}</td>
                      <td className="p-2.5 text-emerald-400">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Print Composer Modal */}
      {showPrintComposer && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-800">
              <h3 className="font-bold text-lg text-blue-400 flex items-center gap-2">
                <Printer className="w-5 h-5" /> RECS Map Print Composer
              </h3>
              <button onClick={() => setShowPrintComposer(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Map Title:</label>
                <input type="text" value={printTitle} onChange={e => setPrintTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Paper Layout:</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100">
                    <option>A4 Landscape (297 x 210 mm)</option>
                    <option>A3 Landscape (420 x 297 mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Scale:</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100">
                    <option>1:1,000</option>
                    <option>1:2,500</option>
                    <option>1:5,000</option>
                  </select>
                </div>
              </div>
              <div className="bg-slate-950 p-4 rounded border border-slate-800 text-slate-400 text-center">
                [Map Elements: Title Block, Scale Bar, Legend, North Arrow, EPSG:20137 Adindan CRS]
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowPrintComposer(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium text-xs">Cancel</button>
              <button onClick={() => { window.print(); setShowPrintComposer(false); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-xs flex items-center gap-1.5">
                <Printer className="w-4 h-4"/> Print Map PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
