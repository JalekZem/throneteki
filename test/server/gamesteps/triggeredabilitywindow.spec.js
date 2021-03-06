/*global describe, it, beforeEach, expect, jasmine*/
/* eslint no-invalid-this: 0 */

const _ = require('underscore');

const TriggeredAbilityWindow = require('../../../server/game/gamesteps/triggeredabilitywindow.js');

describe('TriggeredAbilityWindow', function() {
    beforeEach(function() {
        this.player1Spy = jasmine.createSpyObj('player', ['setPrompt', 'cancelPrompt']);
        this.player2Spy = jasmine.createSpyObj('player', ['setPrompt', 'cancelPrompt']);

        this.gameSpy = jasmine.createSpyObj('game', ['getPlayersInFirstPlayerOrder', 'promptWithMenu', 'resolveAbility']);
        this.gameSpy.getPlayersInFirstPlayerOrder.and.returnValue([this.player1Spy, this.player2Spy]);

        this.event = { name: 'onFoo', params: [] };


        this.window = new TriggeredAbilityWindow(this.gameSpy, {
            event: this.event,
            abilityType: 'interrupt'
        });

        this.setupWindowChoices = () => {
            function createCard(properties) {
                let cardSpy = jasmine.createSpyObj('card', ['getSummary']);
                _.extend(cardSpy, properties);
                return cardSpy;
            }

            this.abilityCard1 = createCard({ card: 1, name: 'The Card', controller: this.player1Spy });
            this.ability1Spy = jasmine.createSpyObj('ability', ['meetsRequirements']);
            this.ability1Spy.meetsRequirements.and.returnValue(true);
            this.context1 = { context: 1 };

            this.abilityCard2 = createCard({ card: 2, name: 'The Card 2', controller: this.player1Spy });
            this.ability2Spy = jasmine.createSpyObj('ability', ['meetsRequirements']);
            this.ability2Spy.meetsRequirements.and.returnValue(true);
            this.context2 = { context: 2 };

            this.abilityCard3 = createCard({ card: 3, name: 'Their Card', controller: this.player2Spy });
            this.ability3Spy = jasmine.createSpyObj('ability', ['meetsRequirements']);
            this.ability3Spy.meetsRequirements.and.returnValue(true);
            this.context3 = { context: 3 };

            this.window.abilityChoices = [
                { id: '1', ability: this.ability1Spy, card: this.abilityCard1, choice: 'choice1', context: this.context1, player: this.player1Spy, text: 'My Choice 1' },
                { id: '2', ability: this.ability1Spy, card: this.abilityCard1, choice: 'choice2', context: this.context1, player: this.player1Spy, text: 'My Choice 2' },
                { id: '3', ability: this.ability2Spy, card: this.abilityCard2, choice: 'default', context: this.context2, player: this.player1Spy, text: 'default' },
                { id: '4', ability: this.ability3Spy, card: this.abilityCard3, choice: 'default', context: this.context3, player: this.player2Spy, text: 'default' }
            ];
        };

    });

    describe('registerAbility()', function() {
        beforeEach(function() {
            this.abilityCard = { card: 1, name: 'The Card', controller: this.player1Spy };
            this.abilitySpy = jasmine.createSpyObj('ability', ['getChoices', 'hasMax']);
            this.abilitySpy.getChoices.and.returnValue([{ text: 'Choice 1', choice: 'choice1' }, { text: 'Choice 2', choice: 'choice2' }]);
            this.abilitySpy.card = this.abilityCard;
            this.context = { context: 1 };
        });

        describe('when a normal ability is registered', function() {
            beforeEach(function() {
                this.window.registerAbility(this.abilitySpy, this.context);
            });

            it('should add each choice for the ability', function() {
                expect(this.window.abilityChoices.length).toBe(2);
                expect(this.window.abilityChoices).toContain(jasmine.objectContaining({
                    ability: this.abilitySpy,
                    card: this.abilityCard,
                    choice: 'choice1',
                    context: this.context,
                    player: this.player1Spy,
                    text: 'Choice 1'
                }));
                expect(this.window.abilityChoices).toContain(jasmine.objectContaining({
                    ability: this.abilitySpy,
                    card: this.abilityCard,
                    choice: 'choice2',
                    context: this.context,
                    player: this.player1Spy,
                    text: 'Choice 2'
                }));
            });

            it('should generate unique IDs for each choice', function() {
                let ids = _.pluck(this.window.abilityChoices, 'id');
                expect(_.uniq(ids)).toEqual(ids);
            });
        });

        describe('when the ability has a maximum', function() {
            beforeEach(function() {
                this.abilitySpy.hasMax.and.returnValue(true);
            });

            describe('and an ability from a card with that title has not been registered', function() {
                beforeEach(function() {
                    this.window.registerAbility(this.abilitySpy, this.context);
                });

                it('should register as normal', function() {
                    expect(this.window.abilityChoices).toContain(jasmine.objectContaining({
                        ability: this.abilitySpy
                    }));
                });
            });

            describe('and an ability from a card with that title has been registered', function() {
                beforeEach(function() {
                    this.window.abilityChoices.push({ card: { name: 'The Card' } });

                    this.window.registerAbility(this.abilitySpy, this.context);
                });

                it('should not register the ability', function() {
                    expect(this.window.abilityChoices).not.toContain(jasmine.objectContaining({
                        ability: this.abilitySpy
                    }));
                });
            });
        });
    });

    describe('continue()', function() {
        beforeEach(function() {
            this.setupWindowChoices();
        });

        describe('when there are no remaining players', function() {
            beforeEach(function() {
                this.window.players = [];
                this.result = this.window.continue();
            });

            it('should not prompt', function() {
                expect(this.gameSpy.promptWithMenu).not.toHaveBeenCalled();
            });

            it('should complete the prompt', function() {
                expect(this.result).toBe(true);
            });
        });

        describe('when there are no remaining choices', function() {
            beforeEach(function() {
                this.window.abilityChoices = [];
                this.result = this.window.continue();
            });

            it('should not prompt', function() {
                expect(this.gameSpy.promptWithMenu).not.toHaveBeenCalled();
            });

            it('should complete the prompt', function() {
                expect(this.result).toBe(true);
            });
        });

        describe('when there are choices', function() {
            describe('and all ability requirements have been met', function() {
                beforeEach(function() {
                    this.result = this.window.continue();
                });

                it('should prompt the first player', function() {
                    expect(this.gameSpy.promptWithMenu).toHaveBeenCalledWith(this.player1Spy, this.window, jasmine.objectContaining({
                        activePrompt: {
                            menuTitle: jasmine.any(String),
                            buttons: [
                                jasmine.objectContaining({ text: 'The Card - My Choice 1', arg: '1', method: 'chooseAbility' }),
                                jasmine.objectContaining({ text: 'The Card - My Choice 2', arg: '2', method: 'chooseAbility' }),
                                jasmine.objectContaining({ text: 'The Card 2', arg: '3', method: 'chooseAbility' }),
                                jasmine.objectContaining({ text: 'Pass', method: 'pass' })
                            ]
                        }
                    }));
                });

                it('should continue to prompt', function() {
                    expect(this.result).toBe(false);
                });
            });

            describe('and an ability requirement has not been met', function() {
                beforeEach(function() {
                    this.ability1Spy.meetsRequirements.and.returnValue(false);
                    this.window.continue();
                });

                it('should filter out choices for that ability', function() {
                    expect(this.gameSpy.promptWithMenu).toHaveBeenCalledWith(this.player1Spy, this.window, jasmine.objectContaining({
                        activePrompt: {
                            menuTitle: jasmine.any(String),
                            buttons: [
                                jasmine.objectContaining({ text: 'The Card 2', arg: '3', method: 'chooseAbility' }),
                                jasmine.objectContaining({ text: 'Pass', method: 'pass' })
                            ]
                        }
                    }));
                });
            });

            describe('and all abilities for the current player are not eligible', function() {
                beforeEach(function() {
                    this.ability1Spy.meetsRequirements.and.returnValue(false);
                    this.ability2Spy.meetsRequirements.and.returnValue(false);
                    this.window.continue();
                });

                it('should prompt the next player', function() {
                    expect(this.gameSpy.promptWithMenu).toHaveBeenCalledWith(this.player2Spy, this.window, jasmine.objectContaining({
                        activePrompt: {
                            menuTitle: jasmine.any(String),
                            buttons: [
                                jasmine.objectContaining({ text: 'Their Card', arg: '4', method: 'chooseAbility' }),
                                jasmine.objectContaining({ text: 'Pass', method: 'pass' })
                            ]
                        }
                    }));
                });
            });

            describe('and all abilities for the every player are not eligible', function() {
                beforeEach(function() {
                    this.ability1Spy.meetsRequirements.and.returnValue(false);
                    this.ability2Spy.meetsRequirements.and.returnValue(false);
                    this.ability3Spy.meetsRequirements.and.returnValue(false);
                    this.result = this.window.continue();
                });

                it('should not prompt', function() {
                    expect(this.gameSpy.promptWithMenu).not.toHaveBeenCalled();
                });

                it('should complete the prompt', function() {
                    expect(this.result).toBe(true);
                });
            });
        });
    });

    describe('chooseAbility()', function() {
        beforeEach(function() {
            this.setupWindowChoices();
        });

        describe('when the player select a non-existent choice', function() {
            beforeEach(function() {
                this.window.chooseAbility(this.player1Spy, 'foo');
            });

            it('should not resolve an ability', function() {
                expect(this.gameSpy.resolveAbility).not.toHaveBeenCalled();
            });
        });

        describe('when the player select a choice they do not own', function() {
            beforeEach(function() {
                // Choosing a player 2 ability
                this.window.chooseAbility(this.player1Spy, '4');
            });

            it('should not resolve an ability', function() {
                expect(this.gameSpy.resolveAbility).not.toHaveBeenCalled();
            });
        });

        describe('when the player selects a valid choice', function() {
            beforeEach(function() {
                this.window.chooseAbility(this.player1Spy, '2');
            });

            it('should update the ability context with the choice made', function() {
                expect(this.context1.choice).toBe('choice2');
            });

            it('should resolve the ability', function() {
                expect(this.gameSpy.resolveAbility).toHaveBeenCalledWith(this.ability1Spy, this.context1);
            });

            it('should remove all choices for that card', function() {
                let remainingIds = _.pluck(this.window.abilityChoices, 'id');
                expect(remainingIds).toEqual(['3', '4']);
            });

            it('should rotate the order of players to allow the next player pick next', function() {
                expect(this.window.players).toEqual([this.player2Spy, this.player1Spy]);
            });
        });
    });

    describe('pass()', function() {
        it('should remove the current player from prompt order', function() {
            this.window.players = [this.player1Spy, this.player2Spy];
            this.window.pass();
            expect(this.window.players).toEqual([this.player2Spy]);
        });
    });
});
