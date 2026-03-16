import React, { useState, useEffect } from 'react';
import {
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    Upload,
    Image as ImageIcon,
    FileText,
    Users,
    Clock,
    Hash,
    ChevronDown,
    Link,
    Star,
    Calendar,
    AlertTriangle,
    Film,
    Plus,
    Loader2,
    PlayCircle,
    CalendarClock,
    Ban
} from 'lucide-react';
import { Movie, moviesService, TmdbSearchResult } from '../../services/movies.service';

interface MovieModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (movie: Partial<Movie>) => void;
    movie?: Movie | null;
}

const SECTIONS = ['Tendances', 'Action', 'Horreur', 'Animé', 'Fantastique', 'Aventure', 'Comédie'];

const DatePicker = ({ value, onChange, placeholder }: { value: string, onChange: (date: string) => void, placeholder: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    
    useEffect(() => {
        if (isOpen && value) {
            setViewDate(new Date(value));
        }
    }, [isOpen, value]);

    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    
    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        // Create date in local timezone to avoid off-by-one errors with ISO string conversion
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onChange(`${year}-${month}-${d}`);
        setIsOpen(false);
    };

    // Format display date
    const displayDate = value ? new Date(value).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : '';

    return (
        <div className="relative">
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus-within:ring-2 focus-within:ring-blue-500/50 outline-none h-[50px] flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors select-none"
            >
                <span className={value ? "text-white" : "text-slate-500"}>
                    {displayDate || placeholder}
                </span>
                <CalendarClock className="w-4 h-4 text-slate-400" />
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setIsOpen(false)} />
                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[60] p-4 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="font-semibold text-white">
                                {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                            </span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Week Days */}
                        <div className="grid grid-cols-7 mb-2">
                            {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(day => (
                                <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => {
                                const day = i + 1;
                                const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = value === dateStr;
                                const today = new Date();
                                const isToday = currentDate.getDate() === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDateClick(day)}
                                        className={`
                                            h-8 w-8 rounded-lg text-sm font-medium flex items-center justify-center transition-all
                                            ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                                            ${isToday && !isSelected ? 'border border-blue-500/50 text-blue-400' : ''}
                                        `}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const MovieModal: React.FC<MovieModalProps> = ({ isOpen, onClose, onSave, movie }) => {
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Movie>>({
        title: '',
        poster: '',
        coverImage: '',
        titleLogo: '',
        description: '',
        ageRating: '',
        score: 0,
        section: 'Tendances',
        genres: [],
        releaseDate: '',
        isTop10: false,
        isHero: false,
        status: 'active',
        scheduledDate: '',
        videoUrl: '',
        duration: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (movie) {
            setFormData({
                ...movie,
                genres: movie.genres || [],
                releaseDate: movie.releaseDate ? new Date(movie.releaseDate).toISOString().split('T')[0] : '',
                scheduledDate: movie.scheduledDate ? new Date(movie.scheduledDate).toISOString().split('T')[0] : '',
                videoUrl: movie.videoUrl || '',
                duration: movie.duration || ''
            });
        } else {
            setFormData({
                title: '',
                poster: '',
                coverImage: '',
                titleLogo: '',
                description: '',
                ageRating: '',
                score: 0,
                section: 'Tendances',
                genres: [],
                releaseDate: new Date().getFullYear().toString(),
                isTop10: false,
                isHero: false,
                status: 'active',
                scheduledDate: '',
                videoUrl: '',
                duration: ''
            });
        }
    }, [movie, isOpen]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim() && !movie) { // Don't search if editing existing movie unless user types
                handleSearch();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        setIsSearching(true);
        try {
            const results = await moviesService.searchTmdb(searchQuery);
            setSearchResults(results);
            setShowResults(true);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectResult = async (result: TmdbSearchResult) => {
        // Don't set searchQuery here to avoid re-triggering search loop
        // Or if we do, we need to handle it. 
        // Let's keep the search query as is or update it but maybe we accept one re-search.
        // Actually, if we update searchQuery, it triggers useEffect -> handleSearch.
        // To avoid flickering, we can just update the form data.
        
        setIsSearching(true);
        setShowResults(false);
        // setSearchQuery(result.title); // Optional: keep the query or update it. Updating it feels natural.
        
        try {
            const details = await moviesService.getTmdbDetails(result.id.toString());
            setFormData(prev => ({
                ...prev,
                ...details,
                releaseDate: details.releaseDate ? details.releaseDate : prev.releaseDate
            }));
        } catch (error) {
            console.error('Failed to get details', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            onSave(formData);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden w-full transition-all duration-300 max-w-7xl h-[90vh] flex flex-col">

                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 shrink-0 gap-4">
                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white whitespace-nowrap">
                            {movie ? 'Modifier le Film' : 'Nouveau Film'}
                        </h2>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-xl mx-4 relative z-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher sur TMDB..."
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-24 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500 text-sm"
                            />
                            <button 
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 rounded-md text-xs font-medium transition-colors"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
                            </button>
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                                {searchResults.map((result) => (
                                    <div 
                                        key={result.id}
                                        onClick={() => handleSelectResult(result)}
                                        className="flex gap-3 p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0 transition-colors"
                                    >
                                        <div className="w-12 h-16 bg-slate-900 rounded overflow-hidden shrink-0">
                                            {result.poster ? (
                                                <img src={result.poster} alt={result.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                    <Film className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium truncate">{result.title}</h4>
                                            <div className="text-sm text-slate-400 mt-1">
                                                {result.releaseDate ? new Date(result.releaseDate).getFullYear() : 'N/A'}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{result.overview}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showResults && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 text-center text-slate-400 z-50">
                                Aucun résultat trouvé
                            </div>
                        )}
                        {/* Overlay to close results when clicking outside */}
                        {showResults && (
                            <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    <div className="space-y-8">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Left Column: Visuals & Description */}
                            <div className="col-span-12 lg:col-span-7 space-y-6">
                                {/* Row 1: Visuals (Poster, Cover, Logo) */}
                                <div className="flex flex-col sm:flex-row gap-4 h-56">
                                    {/* Poster */}
                                    <div className="w-36 shrink-0 space-y-2 h-full flex flex-col">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" /> Affiche
                                        </label>
                                        <div className="flex-1 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden">
                                            {formData.poster ? (
                                                <img src={formData.poster} alt="Poster" className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                                        <Upload className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                                                        <span className="text-xs font-medium text-center px-1">Poster</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                                <input
                                                    type="text"
                                                    value={formData.poster || ''}
                                                    onChange={(e) => setFormData({...formData, poster: e.target.value})}
                                                    className="w-full bg-black/50 text-white text-xs p-2 rounded border border-white/20"
                                                    placeholder="URL..."
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cover (Backdrop) */}
                                    <div className="flex-1 space-y-2 h-full flex flex-col">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" /> Couverture (Backdrop)
                                        </label>
                                        <div className="flex-1 w-full bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden">
                                            {formData.coverImage ? (
                                                <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                                        <Upload className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                                                        <span className="text-xs font-medium">Couverture</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                <input
                                                    type="text"
                                                    value={formData.coverImage || ''}
                                                    onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                                                    className="w-full bg-black/50 text-white text-xs p-2 rounded border border-white/20"
                                                    placeholder="URL de la couverture..."
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logo */}
                                    <div className="w-40 shrink-0 space-y-2 h-full flex flex-col">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" /> Logo
                                        </label>
                                        <div className="flex-1 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden">
                                            {formData.titleLogo ? (
                                                <div className="relative w-full h-full p-2 flex items-center justify-center bg-black/40 rounded-lg">
                                                    <img 
                                                        src={formData.titleLogo} 
                                                        alt="Logo" 
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            e.currentTarget.parentElement?.classList.add('border-red-500/50', 'border');
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs font-medium hidden">
                                                        Image invalide
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                                        <Upload className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                                                        <span className="text-xs font-medium">Logo</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                                <input
                                                    type="text"
                                                    value={formData.titleLogo || ''}
                                                    onChange={(e) => setFormData({...formData, titleLogo: e.target.value})}
                                                    className="w-full bg-black/50 text-white text-xs p-2 rounded border border-white/20"
                                                    placeholder="URL du logo..."
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Synopsis / Description
                                    </label>
                                    <textarea 
                                        rows={5} 
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none resize-none" 
                                        placeholder="Résumé du film..." 
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <Link className="w-4 h-4" /> URL du Film (M3U8)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.videoUrl || ''}
                                        onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none font-mono text-sm"
                                        placeholder="https://exemple.com/video.m3u8"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Metadata & Details */}
                            <div className="col-span-12 lg:col-span-5 space-y-6">
                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <Film className="w-4 h-4" /> Titre
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.title || ''}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" 
                                        placeholder="Titre du film..." 
                                    />
                                </div>

                                {/* Tech Specs */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300 truncate">Année</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input 
                                                type="text" 
                                                maxLength={4}
                                                value={formData.releaseDate ? (formData.releaseDate.includes('-') ? formData.releaseDate.split('-')[0] : formData.releaseDate) : ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setFormData({...formData, releaseDate: val});
                                                }}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-2 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                                                placeholder="YYYY"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300 truncate">Durée</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input 
                                                type="text" 
                                                value={formData.duration || ''}
                                                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-2 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                                                placeholder="ex: 2h 15m" 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300 truncate">Age</label>
                                        <div className="relative">
                                            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input 
                                                type="text" 
                                                value={formData.ageRating || ''}
                                                onChange={(e) => setFormData({...formData, ageRating: e.target.value})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-2 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                                                placeholder="12+" 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Score</label>
                                        <div className="relative">
                                            <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                max="10"
                                                value={formData.score || 0}
                                                onChange={(e) => setFormData({...formData, score: parseFloat(e.target.value)})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-2 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Genres */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <Hash className="w-4 h-4" /> Genres
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.genres?.join(', ') || ''}
                                        onChange={(e) => setFormData({...formData, genres: e.target.value.split(',').map(g => g.trim()).filter(Boolean)})}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" 
                                        placeholder="Action, Aventure, Science-Fiction..." 
                                    />
                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                    {/* Section & Categories */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <Hash className="w-4 h-4" /> Section / Catégorie
                                        </label>
                                        <div className="relative">
                                            <select 
                                                value={formData.section}
                                                onChange={(e) => setFormData({...formData, section: e.target.value as any})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer"
                                            >
                                                {SECTIONS.map(section => (
                                                    <option key={section} value={section}>{section}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Feature Dropdown (Hero/Top10) */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <Star className="w-4 h-4" /> Mise en avant
                                        </label>
                                        <div className="relative">
                                            <select 
                                                value={
                                                    formData.isHero && formData.isTop10 ? 'both' :
                                                    formData.isHero ? 'hero' :
                                                    formData.isTop10 ? 'top10' :
                                                    'standard'
                                                }
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        isTop10: val === 'top10' || val === 'both',
                                                        isHero: val === 'hero' || val === 'both'
                                                    });
                                                }}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="standard">Standard (Aucun)</option>
                                                <option value="top10">Top 10</option>
                                                <option value="hero">Section Héros</option>
                                                <option value="both">Top 10 & Héros</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Scheduling */}
                                <div className="space-y-4 pt-4 border-t border-slate-800">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Programmer Button */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                                <CalendarClock className="w-4 h-4" /> Programmation
                                            </label>
                                            <DatePicker 
                                                value={formData.scheduledDate || ''}
                                                onChange={(date) => {
                                                    setFormData({
                                                        ...formData, 
                                                        scheduledDate: date,
                                                        status: date ? 'scheduled' : 'active'
                                                    });
                                                }}
                                                placeholder="Programmer une date..."
                                            />
                                        </div>

                                        {/* Badges Radio Buttons */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                                <Star className="w-4 h-4" /> Badge
                                            </label>
                                            <div className="flex gap-3">
                                                <label className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all h-[50px] ${formData.badge === 'new' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.badge === 'new' ? 'border-blue-500 bg-blue-500' : 'border-slate-500'}`}>
                                                        {formData.badge === 'new' && <div className="w-2 h-2 text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name="badge"
                                                        value="new"
                                                        checked={formData.badge === 'new'}
                                                        onChange={() => setFormData({...formData, badge: 'new'})}
                                                        className="hidden"
                                                    />
                                                    <span className={`text-sm font-medium ${formData.badge === 'new' ? 'text-blue-400' : 'text-slate-300'}`}>Nouveau</span>
                                                </label>
                                                
                                                <label className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all h-[50px] ${formData.badge === 'recent' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.badge === 'recent' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500'}`}>
                                                        {formData.badge === 'recent' && <div className="w-2 h-2 text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name="badge"
                                                        value="recent"
                                                        checked={formData.badge === 'recent'}
                                                        onChange={() => setFormData({...formData, badge: 'recent'})}
                                                        className="hidden"
                                                    />
                                                    <span className={`text-sm font-medium ${formData.badge === 'recent' ? 'text-emerald-400' : 'text-slate-300'}`}>Récent</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-800 bg-slate-900/50 shrink-0">
                    <div className="grid grid-cols-12 gap-8">
                        <div className="hidden lg:block lg:col-span-7"></div>
                        <div className="col-span-12 lg:col-span-5 flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors font-medium border border-slate-700 text-sm"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    movie ? 'Enregistrer' : 'Publier'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MovieModal;
