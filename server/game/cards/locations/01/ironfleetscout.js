const DrawCard = require('../../../drawcard.js');
 
class IronFleetScout extends DrawCard {
    constructor(owner, cardData) {
        super(owner, cardData);

        this.registerEvents(['onAfterChallenge']);
    }

    setupCardAbilities() {
        this.action({
            title: 'Kneel this card to give a character +1 STR',
            method: 'kneel'
        });
    }    

    kneel(player) {
        if(this.location !== 'play area' || !this.game.currentChallenge || this.kneeled) {
            return false;
        }

        this.game.promptForSelect(player, {
            cardCondition: card => this.cardCondition(card),
            activePromptTitle: 'Select character to gain STR',
            waitingPromptTitle: 'Waiting for opponent to use ' + this.name,
            onSelect: (player, card) => this.onCardSelected(player, card)
        });
    }

    cardCondition(card) {
        return card.getType() === 'character' && card.location === 'play area' && this.game.currentChallenge.isParticipating(card) && card.getFaction() === 'greyjoy';
    }

    onCardSelected(player, card) {
        this.kneeled = true;

        this.strength = player.firstPlayer ? 2 : 1;

        card.strengthModifier += this.strength;
        this.modifiedCard = card;

        this.game.addMessage('{0} kneels {1} to give {2} +{3} STR until the end of the challenge', player, this, card, this.strength);

        return true;
    }

    onAfterChallenge() {
        if(this.modifiedCard) {
            this.modifiedCard.strengthModifier -= this.strength;

            this.modifiedCard = undefined;
        }
    }   
}

IronFleetScout.code = '01079';

module.exports = IronFleetScout;