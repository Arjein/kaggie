import { motion } from 'framer-motion'
import { TrophyIcon, StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { type Competition } from '../../types/competition'
import { ANIMATION_CONFIG } from './animations'

interface CompetitionItemProps {
  competition: Competition
  isStarred: boolean
  isSelected: boolean
  onSelect: (competition: Competition) => void
  onToggleStar: (competitionId: string, event: React.MouseEvent) => void
  favoriteTransition: string | null
  starredCompetitions: Set<string>
}

export function CompetitionItem({
  competition,
  isStarred,
  isSelected,
  onSelect,
  onToggleStar,
  favoriteTransition,
  starredCompetitions
}: CompetitionItemProps) {
  const getCompetitionStatus = (comp: Competition): 'active' | 'rolling' | 'past' => {
    // Check explicit status first
    if (comp.status === 'active') return 'active';
    if (comp.status === 'rolling') return 'rolling';
    if (comp.status === 'passed') return 'past';
    
    // Check deadline-based status
    if (!comp.deadline || comp.deadline === 'Indefinite') return 'rolling';
    
    const deadline = new Date(comp.deadline);
    const now = new Date();
    return deadline > now ? 'active' : 'past';
  };

  const status = getCompetitionStatus(competition);
  
  // Determine gradient class based on status and starred state
  let gradientClass: string;
  
  if (isSelected) {
    // Special styling for selected competition - use primary blue
    gradientClass = "from-blue-600 to-blue-700";
  } else if (isStarred) {
    gradientClass = "from-yellow-500 to-yellow-600";
  } else {
    switch (status) {
      case 'active':
        gradientClass = "from-blue-500 to-blue-600";
        break;
      case 'rolling':
        gradientClass = "from-purple-500 to-purple-600";
        break;
      case 'past':
        gradientClass = "from-gray-500 to-gray-600";
        break;
      default:
        gradientClass = "from-blue-500 to-blue-600";
    }
  }

  return (
    <motion.div
      key={competition.id}
      variants={ANIMATION_CONFIG.item}
      className={`w-full p-2 xs:p-3 sm:p-4 rounded-xl border transition-all duration-300 group ${
        isSelected 
          ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/20' 
          : 'border-border-subtle hover:shadow-md bg-bg-overlay'
      }`}
      data-competition-item
      data-competition-id={competition.id}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => onSelect(competition)}
          className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 flex-1 min-w-0 text-left hover:bg-secondary/50 rounded-lg p-2 -m-2 transition-colors duration-200"
        >
          <div className={`w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
            isSelected ? 'ring-2 ring-primary/30' : ''
          }`}>
            {isStarred ? (
              <StarIconSolid className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-white" />
            ) : (
              <TrophyIcon className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm xs:text-xs sm:text-sm font-semibold truncate ${
                isSelected ? 'text-primary' : 'text-text-primary'
              }`}>
                {competition.title}
              </p>
            </div>
            {competition.deadline && competition.deadline !== 'Indefinite' && (
              <p className="text-2xs xs:text-xs sm:text-sm text-text-muted">
                Deadline: {new Date(competition.deadline).toLocaleDateString()}
              </p>
            )}
            {competition.deadline === 'Indefinite' && (
              <p className="text-2xs xs:text-xs sm:text-sm text-text-muted">
                Rolling competition
              </p>
            )}
          </div>
        </button>
        <div className="flex items-center space-x-1 xs:space-x-2 ml-2 xs:ml-4">
          <button
            onClick={(e) => onToggleStar(competition.id, e)}
            className={`p-1 xs:p-2 hover:bg-bg-overlay rounded-lg transition-all duration-300 ${
              favoriteTransition === competition.id ? 'animate-pulse scale-110' : ''
            }`}
            title={starredCompetitions.has(competition.id) ? "Remove from favorites" : "Add to favorites"}
          >
            {starredCompetitions.has(competition.id) ? (
              <StarIconSolid className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-secondary" />
            ) : (
              <StarIcon className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-text-muted hover:text-secondary" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
