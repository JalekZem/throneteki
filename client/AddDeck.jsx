import React from 'react';
import { withRouter } from 'react-router';
import _ from 'underscore';
import $ from 'jquery';
import Typeahead from 'react-bootstrap-typeahead';
import Input from './FormComponents/Input.jsx';
import Select from './FormComponents/Select.jsx';

class AddDeck extends React.Component {
    constructor() {
        super();

        this.state = this.getDefaultState();

        this.verifyDeckname = this.verifyDeckname.bind(this);
        this.onFactionChange = this.onFactionChange.bind(this);
        this.onAgendaChange = this.onAgendaChange.bind(this);
        this.onAddCard = this.onAddCard.bind(this);
        this.addCardChange = this.addCardChange.bind(this);
        this.onCardMouseOut = this.onCardMouseOut.bind(this);
        this.onCardMouseOver = this.onCardMouseOver.bind(this);
        this.onCardListChange = this.onCardListChange.bind(this);
    }

    componentWillMount() {
        $.ajax({
            url: '/api/cards',
            type: 'GET'
        }).done((data) => {
            var agendas = _.filter(data.cards, function(card) {
                return card.type_code === 'agenda' && card.pack_code !== 'VDS';
            });

            this.setState({ cards: data.cards, agendas: agendas });
        });

        $.ajax({
            url: '/api/packs',
            type: 'GET'
        }).done((data) => {
            this.setState({ packs: data.packs });
        });
    }

    getDefaultState() {
        return {
            error: '',
            deckname: 'New Deck',
            selectedFaction: {
                name: 'House Baratheon',
                value: 'baratheon'
            },
            selectedAgenda: {},
            agendaName: '',
            cardToAdd: {},
            numberToAdd: 1,
            cardToShow: undefined,
            validation: {
                deckname: '',
                cardToAdd: ''
            },
            drawCards: [],
            plotCards: [],
            agendas: [],
            cards: [],
            packs: [],
            factions: [
                { name: 'House Baratheon', value: 'baratheon' },
                { name: 'House Greyjoy', value: 'greyjoy' },
                { name: 'House Lannister', value: 'lannister' },
                { name: 'House Martell', value: 'martell' },
                { name: 'The Night\'s Watch', value: 'thenightswatch' },
                { name: 'House Stark', value: 'stark' },
                { name: 'House Targaryen', value: 'targaryen' },
                { name: 'House Tyrell', value: 'tyrell' }
            ],
            cardList: ''
        };
    }

    verifyDeckname() {
    }

    onChange(field, event) {
        var newState = {};

        newState[field] = event.target.value;
        this.setState(newState);
    }

    onFactionChange(event) {
        var faction = _.find(this.state.factions, (faction) => {
            return faction.value === event.target.value;
        });

        this.setState({ selectedFaction: faction });
    }

    onAgendaChange(event) {
        var agenda = _.find(this.state.agendas, function(agenda) {
            return agenda.code === event.target.value;
        });

        this.setState({ selectedAgenda: agenda });
    }

    onCardListChange(event) {
        var split = event.target.value.split('\n');

        this.setState({ drawCards: [], plotCards: [] }, () => {
            _.each(split, line => {
                var index = 2;

                if(!$.isNumeric(line[0])) {
                    return;
                }

                var num = parseInt(line[0]);
                if(line[1] === 'x') {
                    index++;
                }

                var packOffset = line.indexOf('(');
                var cardName = line.substr(index, packOffset === -1 ? line.length : packOffset - index - 1);
                var packName = line.substr(packOffset + 1, line.length - packOffset - 2);

                var pack = _.find(this.state.packs, function(pack) {
                    return pack.name === packName;
                });

                var card = _.find(this.state.cards, function(card) {
                    if(pack) {
                        return card.label.toLowerCase() === cardName.toLowerCase() || card.label.toLowerCase() === (cardName + ' (' + pack.code + ')').toLowerCase();
                    }

                    return card.label.toLowerCase() === cardName.toLowerCase();
                });

                if(card) {
                    this.addCard(card, num);
                }
            });
        });

        this.setState({ cardList: event.target.value });
    }

    onCardMouseOver(event) {
        var cardToDisplay = _.filter(this.state.cards, card => {
            return event.target.innerText === card.label;
        });

        this.setState({ cardToShow: cardToDisplay[0] });
    }

    onCardMouseOut() {
        this.setState({ cardToShow: undefined });
    }

    addCardChange(selectedCards) {
        this.setState({ cardToAdd: selectedCards[0] });
    }

    addCard(card, number) {
        var plots = this.state.plotCards;
        var draw = this.state.drawCards;

        var list;

        if(card.type_code === 'plot') {
            list = plots;
        } else {
            list = draw;
        }

        if(list[card.code]) {
            list[card.code].count += number;
        } else {
            list.push({ count: number, card: card });
        }

        this.setState({ plotCards: plots, drawCards: draw });
    }

    onAddCard(event) {
        event.preventDefault();

        var cardList = this.state.cardList;

        cardList += this.state.numberToAdd + ' ' + this.state.cardToAdd.label + '\n';

        this.addCard(this.state.cardToAdd, parseInt(this.state.numberToAdd));

        this.setState({ cardList: cardList });
    }

    render() {
        var errorBar = this.state.error ? <div className='alert alert-danger' role='alert'>{ this.state.error }</div> : null;

        var cardsToRender = [];
        var groupedCards = {};
        var combinedCards = _.union(this.state.plotCards, this.state.drawCards);

        _.each(combinedCards, (card) => {
            if(!groupedCards[card.card.type_name]) {
                groupedCards[card.card.type_name] = [card];
            } else {
                groupedCards[card.card.type_name].push(card);
            }
        });

        _.each(groupedCards, (cardList, key) => {
            var cards = [];
            var count = 0;

            _.each(cardList, card => {
                cards.push(<div key={ card.card.code }><span>{card.count + 'x '}</span><span className='card-name' onMouseOver={ this.onCardMouseOver } onMouseOut={ this.onCardMouseOut }>{ card.card.label }</span></div>);
                count += parseInt(card.count);
            });

            cardsToRender.push(<div key={ key } className='card-group'><h4>{ key + ' (' + count.toString() + ')' }</h4>{ cards }</div>);
        });

        var cardCount = 0;
        var plotCount = 0;

        _.each(this.state.drawCards, function(card) {
            cardCount += parseInt(card.count);
        });

        _.each(this.state.plotCards, function(card) {
            plotCount += parseInt(card.count);
        });

        return (
            <div>
                { errorBar }
                { this.state.cardToShow ? <img className='hover-image' src={ '/img/cards/' + this.state.cardToShow.code + '.png' } /> : null }
                <form className='form form-horizontal col-sm-6'>
                    <Input name='deckname' label='Deck Name' labelClass='col-sm-2' fieldClass='col-sm-9' placeholder='Deck Name'
                        type='text' onChange={ this.onChange.bind(this, 'deckname') } value={ this.state.deckname } />
                    <Select name='faction' label='Faction' labelClass='col-sm-2' fieldClass='col-sm-9' options={ this.state.factions }
                        onChange={ this.onFactionChange } value={ this.state.selectedFaction.value } />
                    <Select name='agenda' label='Agenda' labelClass='col-sm-2' fieldClass='col-sm-9' options={ this.state.agendas }
                        onChange={ this.onAgendaChange } value={ this.state.selectedAgenda.code } valueKey='code' nameKey='label' blankOption={ { label: '- Select -' } } />
                    <div className='form-group'>
                        <label className='col-sm-2 control-label'>Card</label>
                        <div className='col-sm-5'>
                            <Typeahead labelKey={ 'label' } options={ this.state.cards } onChange={ this.addCardChange } />
                        </div>
                        <div className='form-group'>
                            <label className='col-sm-1 control-label'>Num</label>
                            <div className='col-sm-1'>
                                <input className='form-control' type='text' value={ this.state.numberToAdd } onChange={ this.onChange.bind(this, 'numberToAdd') } />
                            </div>
                            <div className='col-sm-1'>
                                <button className='btn btn-default' onClick={ this.onAddCard }>Add</button>
                            </div>
                        </div>
                    </div>
                    <div className='form-group'>
                        <label className='col-sm-2 control-label'>Cards</label>
                        <div className='col-sm-9'>
                            <textarea className='form-control' rows='25' value={ this.state.cardList } onChange={ this.onCardListChange } />
                        </div>
                    </div>
                    <div className='form-group'>
                        <div className='col-sm-offset-2 col-sm-8'>
                            <button ref='submit' type='submit' className='btn btn-primary' onClick={ this.onAddDeck }>Add Deck</button>
                        </div>
                    </div>
                </form>
                <div className='col-sm-6 right-pane'>
                    <h3>{ this.state.deckname }</h3>
                    <div className='decklist'>
                        <img className='pull-left' src={ '/img/factions/' + this.state.selectedFaction.value + '.png' } />
                        { this.state.selectedAgenda.code ? <img className='pull-right' src={ '/img/cards/' + this.state.selectedAgenda.code + '.png' } /> : null }
                        <div>
                            <h4>{ this.state.selectedFaction.name }</h4>
                            <div>Agenda: <span className='card-name' onMouseOver={ this.onCardMouseOver } onMouseOut={ this.onCardMouseOut }>{ this.state.selectedAgenda.label || 'None' }</span></div>
                            <div>Draw deck: { cardCount } cards</div>
                            <div>Plot deck: { plotCount } cards</div>
                        </div>
                    </div>
                    <div className='cards'>
                        { cardsToRender }
                    </div>
                </div>
            </div>);
    }
}

AddDeck.displayName = 'AddDeck';
AddDeck.propTypes = {
    router: React.PropTypes.shape({
        push: React.PropTypes.func.isRequired
    }).isRequired
};

export default withRouter(AddDeck, { withRef: true });