const Group = require('../models/Group');
const Rotation = require('../models/Rotation');
const whatsappService = require('./whatsappService');
const logger = require('../utils/logger');
const moment = require('moment');

class RotationService {
  async processRotations() {
    try {
      const activeGroups = await Group.find({ isActive: true }).populate('members.user');

      for (const group of activeGroups) {
        await this.processGroupRotation(group);
      }

      logger.info('Weekly rotation processing completed');
    } catch (error) {
      logger.error('Rotation processing error:', error);
    }
  }

  async processGroupRotation(group) {
    try {
      const { cycle, week } = this.getCurrentCycleAndWeek(group);
      
      // Check if rotation already exists for this cycle/week
      const existingRotation = await Rotation.findOne({
        group: group._id,
        cycle: cycle,
        week: week
      });

      if (existingRotation) {
        return; // Rotation already processed
      }

      // Send reminders to members who haven't contributed
      await this.sendContributionReminders(group, cycle, week);

      // If it's Monday, advance to next week/cycle
      if (moment().day() === 1) {
        await this.advanceGroupCycle(group);
      }

    } catch (error) {
      logger.error(`Group rotation error for ${group.name}:`, error);
    }
  }

  getCurrentCycleAndWeek(group) {
    const startDate = moment(group.startDate);
    const now = moment();
    
    const weeksSinceStart = now.diff(startDate, 'weeks');
    const cycle = Math.floor(weeksSinceStart / group.members.length) + 1;
    const week = (weeksSinceStart % group.members.length) + 1;

    return { cycle, week };
  }

  async sendContributionReminders(group, cycle, week) {
    try {
      const Contribution = require('../models/Contribution');
      
      // Get members who haven't contributed this week
      const contributedUserIds = await Contribution.find({
        group: group._id,
        cycle: cycle,
        week: week,
        status: 'confirmed'
      }).distinct('user');

      const activeMembers = group.members.filter(member => member.isActive);
      const pendingMembers = activeMembers.filter(member => 
        !contributedUserIds.some(userId => userId.toString() === member.user._id.toString())
      );

      // Send reminders
      for (const member of pendingMembers) {
        const reminderMessage = `⏰ *Contribution Reminder*\n\nDon't forget to make your weekly contribution to "${group.name}"!\n\n💰 Amount: ₦${group.contributionAmount.toLocaleString()}\n🔄 Cycle ${cycle}, Week ${week}\n\nType: /contribute ${group._id} ${group.contributionAmount}`;
        
        await whatsappService.sendMessage(member.user.whatsappId, reminderMessage);
      }

      if (pendingMembers.length > 0) {
        logger.info(`Sent ${pendingMembers.length} contribution reminders for group: ${group.name}`);
      }

    } catch (error) {
      logger.error('Reminder sending error:', error);
    }
  }

  async advanceGroupCycle(group) {
    try {
      const { cycle, week } = this.getCurrentCycleAndWeek(group);
      
      // Update group's current cycle
      await Group.updateOne(
        { _id: group._id },
        { currentCycle: cycle }
      );

      // Notify group members about new cycle/week
      const activeMembers = group.members.filter(member => member.isActive);
      const currentRecipientIndex = (week - 1) % activeMembers.length;
      const currentRecipient = activeMembers[currentRecipientIndex];

      const cycleMessage = `📅 *New Week Started!*\n\n👥 Group: ${group.name}\n🔄 Cycle ${cycle}, Week ${week}\n🎯 This week's recipient: ${currentRecipient.user.name}\n\n💰 Contribution deadline: Sunday 11:59 PM\nAmount: ₦${group.contributionAmount.toLocaleString()}\n\nMake your contribution now: /contribute ${group._id} ${group.contributionAmount}`;

      for (const member of activeMembers) {
        await whatsappService.sendMessage(member.user.whatsappId, cycleMessage);
      }

    } catch (error) {
      logger.error('Cycle advancement error:', error);
    }
  }
}

module.exports = new RotationService();