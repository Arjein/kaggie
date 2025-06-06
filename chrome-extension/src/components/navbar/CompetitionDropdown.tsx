import { motion, AnimatePresence } from 'framer-motion'
import { TrophyIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { type Competition } from '../../types/competition'
import { ANIMATION_CONFIG } from './animations'
import { CompetitionItem } from './CompetitionItem'

interface CompetitionDropdownProps {
  isOpen: boolean
  loading: boolean
  competitions: Competition[]
  selectedCompetition: Competition | null
  starredCompetitions: Set<string>
  favoriteTransition: string | null
  onSelect: (competition: Competition | null) => void
  onToggleStar: (competitionId: string, event: React.MouseEvent) => void
}

export function CompetitionDropdown({
  isOpen,
  loading,
  competitions,
  selectedCompetition,
  starredCompetitions,
  favoriteTransition,
  onSelect,
  onToggleStar
}: CompetitionDropdownProps) {
  const getCompetitionStatus = (competition: Competition): 'active' | 'rolling' | 'past' => {
    // Check explicit status first
    if (competition.status === 'active') return 'active';
    if (competition.status === 'rolling') return 'rolling';
    if (competition.status === 'passed') return 'past';
    
    // Check deadline-based status
    if (!competition.deadline || competition.deadline === 'Indefinite') return 'rolling';
    
    const deadline = new Date(competition.deadline);
    const now = new Date();
    return deadline > now ? 'active' : 'past';
  };

  const renderCompetitionSection = (
    title: string,
    icon: React.ReactNode,
    competitions: Competition[],
    showSelected: boolean = false
  ) => {
    if (competitions.length === 0) return null;

    return (
      <motion.div 
        className="mb-6"
        variants={ANIMATION_CONFIG.item}
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          {icon}
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
            {title} ({competitions.length})
          </h4>
        </div>
        <motion.div 
          className="space-y-2"
          variants={ANIMATION_CONFIG.itemStagger}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {competitions.map((competition) => (
            <div key={competition.id}>
              <CompetitionItem
                competition={competition}
                isStarred={starredCompetitions.has(competition.id)}
                isSelected={showSelected && competition.id === selectedCompetition?.id}
                onSelect={onSelect}
                onToggleStar={onToggleStar}
                favoriteTransition={favoriteTransition}
                starredCompetitions={starredCompetitions}
              />
            </div>
          ))}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && !loading && (
        <motion.div 
          className="absolute top-full left-0 right-0 mt-1 bg-bg-overlay border border-border-subtle shadow-2xl rounded-lg z-50 max-h-[600px] overflow-hidden"
          {...ANIMATION_CONFIG.container}
        >
          {/* Scrollable Content */}
          <div className="max-h-[600px] overflow-y-auto">
            {competitions.length === 0 ? (
              <motion.div 
                className="flex flex-col items-center justify-center p-8 text-center text-text-secondary"
                {...ANIMATION_CONFIG.content}
              >
                <TrophyIcon className="h-12 w-12 mx-auto mb-3 text-text-muted" />
                <p className="text-lg">No competitions found</p>
                <p className="text-sm text-text-muted mt-1">Check your backend connection</p>
              </motion.div>
            ) : (
              <motion.div 
                className="p-4 space-y-4"
                variants={ANIMATION_CONFIG.sectionStagger}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Selected Competition Section */}
                {selectedCompetition && renderCompetitionSection(
                  "Currently Selected",
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  </div>,
                  [selectedCompetition],
                  true
                )}

                {/* Favorites Section */}
                {starredCompetitions.size > 0 && renderCompetitionSection(
                  "Favorites",
                  <StarIconSolid className="h-4 w-4 text-secondary" />,
                  competitions.filter(comp => 
                    starredCompetitions.has(comp.id) && comp.id !== selectedCompetition?.id
                  )
                )}

                {/* Active Competitions Section */}
                {renderCompetitionSection(
                  "Active Competitions",
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <TrophyIcon className="h-2.5 w-2.5 text-white" />
                  </div>,
                  competitions.filter(comp => {
                    if (starredCompetitions.has(comp.id) || comp.id === selectedCompetition?.id) return false;
                    return getCompetitionStatus(comp) === 'active';
                  })
                )}

                {/* Rolling Competitions Section */}
                {renderCompetitionSection(
                  "Rolling Competitions",
                  <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <TrophyIcon className="h-2.5 w-2.5 text-white" />
                  </div>,
                  competitions.filter(comp => {
                    if (starredCompetitions.has(comp.id) || comp.id === selectedCompetition?.id) return false;
                    return getCompetitionStatus(comp) === 'rolling';
                  })
                )}

                {/* Past Competitions Section */}
                {renderCompetitionSection(
                  "Past Competitions",
                  <div className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                    <TrophyIcon className="h-2.5 w-2.5 text-white" />
                  </div>,
                  competitions.filter(comp => {
                    if (starredCompetitions.has(comp.id) || comp.id === selectedCompetition?.id) return false;
                    return getCompetitionStatus(comp) === 'past';
                  })
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
