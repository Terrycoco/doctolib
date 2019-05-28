import knex from 'knexClient'
import getAvailabilities from './getAvailabilities'

describe('getAvailabilities', () => {
  beforeEach(() => knex('events').truncate())

  describe('simple case', () => {
    beforeEach(async () => {
      await knex('events').insert([
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 09:30'),
          ends_at: new Date('2014-08-04 12:30'),
          weekly_recurring: true,
        },
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-11 10:30'),
          ends_at: new Date('2014-08-11 11:30'),
        },
      ])
    })


    it('should fetch availabilities correctly', async () => {
      const availabilities = await getAvailabilities(new Date('2014-08-10'))

      expect(availabilities.length).toBe(7)

      expect(String(availabilities[0].date)).toBe(
        String(new Date('2014-08-10')),
      )
      expect(availabilities[0].slots).toEqual([])

      expect(String(availabilities[1].date)).toBe(
        String(new Date('2014-08-11')),
      )
      expect(availabilities[1].slots).toEqual([
        '9:30',
        '10:00',
        '11:30',
        '12:00',
      ])

      expect(availabilities[2].slots).toEqual([])

      expect(String(availabilities[6].date)).toBe(
        String(new Date('2014-08-16')),
      )
    })
  });

  describe('two openings on same day', () => {
    beforeEach(async () => {
      await knex('events').insert([
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 09:30'),
          ends_at: new Date('2014-08-04 12:30'),
          weekly_recurring: true,
        },
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 14:30'),
          ends_at: new Date('2014-08-04 16:30'),
          weekly_recurring: true,
        },
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-11 10:30'),
          ends_at: new Date('2014-08-11 11:30'),
        },
      ])
    })

    it('should handle two openings same day', async () => {
      const availabilities = await getAvailabilities(new Date('2014-08-10'))

      expect(availabilities[1].slots).toEqual([
        '9:30',
        '10:00',
        '11:30',
        '12:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00'
      ])

    })
  })

  describe('recurring appointment', () => {
    beforeEach(async () => {
      await knex('events').insert([
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 09:30'),
          ends_at: new Date('2014-08-04 12:30'),
          weekly_recurring: true,
        },
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 14:30'),
          ends_at: new Date('2014-08-04 16:30'),
          weekly_recurring: true,
        },
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-04 10:30'),
          ends_at: new Date('2014-08-04 11:30'),
          weekly_recurring: true
        },
      ])
    })

    it('should handle recurring appointments', async () => {
      const availabilities = await getAvailabilities(new Date('2014-08-10'))

      expect(availabilities[1].slots).toEqual([
        '9:30',
        '10:00',
        '11:30',
        '12:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00'
      ])
    })
  })

 describe('recurring openings but after given week', () => {
    beforeEach(async () => {
      await knex('events').insert([
        {
          kind: 'opening',
          starts_at: new Date('2014-08-25 09:30'),
          ends_at: new Date('2014-08-25 12:30'),
          weekly_recurring: true,
        },
        {
          kind: 'opening',
          starts_at: new Date('2014-08-25 14:30'),
          ends_at: new Date('2014-08-25 16:30'),
          weekly_recurring: true,
        },
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-04 10:30'),
          ends_at: new Date('2014-08-04 11:30'),
          weekly_recurring: true
        },
      ])
    })

    it('should handle recurring after week ends', async () => {
      const availabilities = await getAvailabilities(new Date('2014-08-10'))

      expect(availabilities[1].slots).toEqual([])
    })
  })

  describe('no openings', () => {
    beforeEach(async () => {
      await knex('events').insert([
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-04 10:30'),
          ends_at: new Date('2014-08-04 11:30'),
          weekly_recurring: true
        },
      ])
    })

    it('should handle no openings', async () => {
      const availabilities = await getAvailabilities(new Date('2014-08-10'))

      expect(availabilities[1].slots).toEqual([])
    })
  });

  describe('no appointments', () => {
    beforeEach(async () => {
      await knex('events').insert([
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 09:30'),
          ends_at: new Date('2014-08-04 12:30'),
          weekly_recurring: true,
        },
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 14:30'),
          ends_at: new Date('2014-08-04 16:30'),
          weekly_recurring: true,
        },
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-25 14:30'),
          ends_at: new Date('2014-08-25 16:30'),
          weekly_recurring: true,
        },
      ])
    })

    it('should handle no appointments', async () => {
      const availabilities = await getAvailabilities(new Date('2014-08-10'))

      expect(availabilities[1].slots).toEqual([
        '9:30',
        '10:00',
        '10:30',
        '11:00',
        '11:30',
        '12:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00'
      ])
    })
  });


describe('abutted appointments', () => {
    beforeEach(async () => {
      await knex('events').insert([
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 09:30'),
          ends_at: new Date('2014-08-04 12:30'),
          weekly_recurring: true,
        },
        {
          kind: 'opening',
          starts_at: new Date('2014-08-04 14:30'),
          ends_at: new Date('2014-08-04 16:30'),
          weekly_recurring: true,
        },
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-11 9:30'),
          ends_at: new Date('2014-08-11 10:30'),
          weekly_recurring: true,
        },
        {
          kind: 'appointment',
          starts_at: new Date('2014-08-04 10:30'),
          ends_at: new Date('2014-08-04 11:30'),
          weekly_recurring: true,
        },
      ])
    })

    it('should handle abutted appointments', async () => {
      const availabilities = await getAvailabilities(new Date('2014-08-10'))

      expect(availabilities[1].slots).toEqual([
        '11:30',
        '12:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00'
      ])
    })
  });
})

