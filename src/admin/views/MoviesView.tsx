import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { moviesService, Movie } from '../../services/movies.service';
import MovieModal from '../components/MovieModal';
import toast from 'react-hot-toast';

const MoviesView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6; // Reduced to match UsersView density

    // Dropdown State
    const [dropdownState, setDropdownState] = useState<{
        movieId: string;
        top: number;
        right: number;
    } | null>(null);

    // Modal State
    const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

    useEffect(() => {
        fetchMovies();
    }, []);

    // Close dropdown on scroll or resize
    useEffect(() => {
        const closeDropdown = () => setDropdownState(null);
        window.addEventListener('scroll', closeDropdown);
        window.addEventListener('resize', closeDropdown);
        return () => {
            window.removeEventListener('scroll', closeDropdown);
            window.removeEventListener('resize', closeDropdown);
        };
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.action-menu-trigger') && !target.closest('.action-menu-dropdown')) {
                setActiveMenu(null);
                setDropdownState(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchMovies = async () => {
        try {
            setIsLoading(true);
            const data = await moviesService.getAllMovies();
            setMovies(data);
        } catch (error) {
            console.error('Error fetching movies:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDropdown = (e: React.MouseEvent, movieId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const menuHeight = 220;

        const spaceBelow = windowHeight - rect.bottom;
        const openUpwards = spaceBelow < menuHeight;

        setDropdownState({
            movieId,
            top: openUpwards ? rect.top - 8 : rect.bottom + 8,
            right: window.innerWidth - rect.right
        });
        setActiveMenu(movieId);
    };

    const handleStatusChange = async (movie: Movie, newStatus: 'active' | 'inactive' | 'scheduled') => {
        try {
            await moviesService.updateMovie(movie.id, { status: newStatus });
            setMovies(movies.map(m => m.id === movie.id ? { ...m, status: newStatus } : m));
            setDropdownState(null);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleToggleBoolean = async (movie: Movie, field: 'isTop10' | 'isHero') => {
        try {
            await moviesService.updateMovie(movie.id, { [field]: !movie[field] });
            setMovies(movies.map(m => m.id === movie.id ? { ...m, [field]: !movie[field] } : m));
            setDropdownState(null);
        } catch (error) {
            console.error(`Failed to update ${field}:`, error);
        }
    };

    const handleSaveMovie = async (movieData: Partial<Movie>) => {
        try {
            if (selectedMovie && modalType === 'edit') {
                // Update
                const updated = await moviesService.updateMovie(selectedMovie.id, movieData);
                setMovies(movies.map(m => m.id === selectedMovie.id ? updated : m));
            } else {
                // Create
                // Ensure required fields are present or handled by service
                const created = await moviesService.createMovie(movieData as any);
                setMovies([...movies, created]);
            }
            setModalType(null);
            setSelectedMovie(null);
            toast.success(selectedMovie ? 'Film mis à jour !' : 'Film créé !');
        } catch (error: any) {
            console.error('Error saving movie:', error);
            const detail = error.message || 'Erreur inconnue';
            toast.error(`Erreur: ${detail}`);
        }
    };

    const handleDelete = async () => {
        if (!selectedMovie) return;
        try {
            await moviesService.deleteMovie(selectedMovie.id);
            setMovies(movies.filter(m => m.id !== selectedMovie.id));
            setModalType(null);
            setSelectedMovie(null);
            toast.success('Film supprimé');
        } catch (error: any) {
            console.error('Failed to delete movie:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    // Filter and Pagination
    const filteredMovies = movies.filter(movie => {
        const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            movie.section.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    const paginatedMovies = filteredMovies.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const formatDateYear = (dateString: string) => {
        return new Date(dateString).getFullYear().toString();
    };

    const formatScheduledDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Actions & Filters */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                    <div className="relative w-full md:w-96 group">
                        <Icon icon="solar:magnifer-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" width="20" height="20" />
                        <input
                            type="text"
                            placeholder="Rechercher un film..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
                        />
                    </div>
                </div>

                <button
                    onClick={() => setModalType('create')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
                >
                    <Icon icon="solar:add-circle-bold" width="18" height="18" />
                    <span>Nouveau film</span>
                </button>
            </div>

            {/* Movies Table Container */}
            <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold w-20">Affiche</th>
                                <th className="px-6 py-4 font-semibold">Titre</th>
                                <th className="px-6 py-4 font-semibold text-center">Année</th>
                                <th className="px-6 py-4 font-semibold text-center">Durée</th>
                                <th className="px-6 py-4 font-semibold text-center">Age</th>
                                <th className="px-6 py-4 font-semibold text-center">Score</th>
                                <th className="px-6 py-4 font-semibold text-center">Section</th>
                                <th className="px-6 py-4 font-semibold text-center">Mise en avant</th>
                                <th className="px-6 py-4 font-semibold text-center">Programmation</th>
                                <th className="px-6 py-4 font-semibold text-center">Statut</th>
                                <th className="px-6 py-4 font-semibold text-right w-16">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Icon icon="svg-spinners:3-dots-fade" width="24" height="24" />
                                            <p className="text-sm">Chargement des films...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedMovies.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-gray-400 text-sm">
                                        Aucun film trouvé
                                    </td>
                                </tr>
                            ) : (
                                paginatedMovies.map((movie) => (
                                    <tr key={movie.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="h-12 w-9 bg-gray-800 border border-white/10 shadow-sm overflow-hidden rounded-md shrink-0">
                                                <img
                                                    src={movie.poster}
                                                    alt={movie.title}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x225?text=No+Img';
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <p className="font-medium text-white text-base">{movie.title}</p>
                                        </td>
                                        <td className="px-6 py-3 text-center text-gray-400 text-sm">
                                            {formatDateYear(movie.releaseDate)}
                                        </td>
                                        <td className="px-6 py-3 text-center text-gray-400 text-sm">
                                            {movie.duration || '-'}
                                        </td>
                                        <td className="px-6 py-3 text-center text-gray-400 text-sm">
                                            {movie.ageRating || '-'}
                                        </td>
                                        <td className="px-6 py-3 text-center text-gray-400 text-sm">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Icon icon="solar:star-bold" className="text-yellow-500 w-4 h-4" />
                                                <span>{movie.score}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="text-gray-300 text-sm">
                                                {movie.section}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex flex-col gap-1 items-center justify-center">
                                                {movie.isTop10 && (
                                                    <span className="text-xs font-bold text-yellow-500 flex items-center gap-1">
                                                        <Icon icon="solar:star-bold" width="12" /> TOP 10
                                                    </span>
                                                )}
                                                {movie.isHero && (
                                                    <span className="text-xs font-bold text-purple-500 flex items-center gap-1">
                                                        <Icon icon="solar:crown-bold" width="12" /> HÉROS
                                                    </span>
                                                )}
                                                {!movie.isTop10 && !movie.isHero && (
                                                    <span className="text-gray-500 text-sm">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center text-sm">
                                            {movie.scheduledDate ? (
                                                <span className="text-blue-400 font-medium">
                                                    {formatScheduledDate(movie.scheduledDate)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {movie.status === 'active' ? (
                                                <span className="text-xs font-medium text-green-400 flex items-center justify-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> En ligne
                                                </span>
                                            ) : movie.status === 'scheduled' ? (
                                                <span className="text-xs font-medium text-blue-400 flex items-center justify-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Programmé
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-gray-500 flex items-center justify-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Inactif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right relative">
                                            <button
                                                onClick={(e) => handleOpenDropdown(e, movie.id)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors action-menu-trigger"
                                            >
                                                <Icon icon="solar:menu-dots-bold" width="24" height="24" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-white/10 flex justify-between items-center bg-white/5">
                        <p className="text-sm text-gray-500">
                            Page {currentPage} sur {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors border border-white/10"
                            >
                                <Icon icon="solar:alt-arrow-left-linear" width="18" height="18" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors border border-white/10"
                            >
                                <Icon icon="solar:alt-arrow-right-linear" width="18" height="18" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dropdown Menu Portal */}
            {dropdownState && (
                <div
                    className="fixed z-50 w-52 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 action-menu-dropdown"
                    style={{
                        top: `${dropdownState.top}px`,
                        right: `${dropdownState.right}px`
                    }}
                >
                    <div className="py-1">
                        {(() => {
                            const movie = movies.find(m => m.id === dropdownState.movieId);
                            if (!movie) return null;

                            return (
                                <>
                                    <button
                                        onClick={() => {
                                            setSelectedMovie(movie);
                                            setModalType('edit');
                                            setDropdownState(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                                    >
                                        <Icon icon="solar:pen-bold" className="text-white" width="16" height="16" />
                                        Modifier
                                    </button>

                                    <div className="h-px bg-white/10 my-1" />

                                    {movie.status === 'active' ? (
                                        <button
                                            onClick={() => handleStatusChange(movie, 'inactive')}
                                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                                        >
                                            <Icon icon="solar:stop-circle-bold" className="text-gray-400" width="16" height="16" />
                                            Désactiver
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStatusChange(movie, 'active')}
                                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                                        >
                                            <Icon icon="solar:play-circle-bold" className="text-green-400" width="16" height="16" />
                                            Activer
                                        </button>
                                    )}

                                    {/* Programming option hidden if needed, or keep it */}
                                    {/* <button
                                        onClick={() => handleStatusChange(movie, 'scheduled')}
                                        className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                                    >
                                        <Icon icon="solar:calendar-add-bold" className="text-blue-400" width="16" height="16" />
                                        Programmer
                                    </button> */}

                                    <div className="h-px bg-white/10 my-1" />

                                    <button
                                        onClick={() => {
                                            setSelectedMovie(movie);
                                            setModalType('delete');
                                            setDropdownState(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                    >
                                        <Icon icon="solar:trash-bin-trash-bold" width="16" height="16" />
                                        Supprimer
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {modalType === 'delete' && selectedMovie && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                                <Icon icon="solar:trash-bin-trash-bold" width="24" height="24" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Supprimer le film ?</h3>
                            <p className="text-gray-400">
                                Êtes-vous sûr de vouloir supprimer <span className="text-white font-medium">"{selectedMovie.title}"</span> ? Cette action est irréversible.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setModalType(null);
                                    setSelectedMovie(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            <MovieModal
                isOpen={modalType === 'create' || modalType === 'edit'}
                onClose={() => {
                    setModalType(null);
                    setSelectedMovie(null);
                }}
                onSave={handleSaveMovie}
                movie={selectedMovie}
            />
        </div>
    );
};

export default MoviesView;
