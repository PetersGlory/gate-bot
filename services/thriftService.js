const Group = require('../models/Group');
const Contribution = require('../models/Contribution');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const paymentService = require('./paymentService');
const { generateReference } = require('../utils/helpers');
const moment = require('moment');

class ThriftService {
  async initiateContribution(userId, groupId, amount) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Check if user is a member
      const isMember = group.members.some(member => 
        member.user.toString() === userId.toString() && member.isActive
      );

      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      // Check if amount matches expected contribution
      if (amount !== group.contributionAmount) {
        return { 
          success: false, 
          error: `Expected contribution amount is ₦${group.contributionAmount.toLocaleString()}` 
        };
      }

      // Calculate current cycle and week
      const { cycle, week } = this.getCurrentCycleAndWeek(group);

      // Check if user already contributed this week
      const existingContribution = await Contribution.findOne({
        user: userId,
        group: groupId,
        cycle: cycle,
        week: week
      });

      if (existingContribution) {
        return { 
          success: false, 
          error: 'You have already contributed for this week' 
        };
      }

      // Generate transaction reference
      const reference = generateReference();

      // Create contribution record
      const contribution = new Contribution({
        user: userId,
        group: groupId,
        amount: amount,
        cycle: cycle,
        week: week,
        transactionReference: reference,
        status: 'pending'
      });

      await contribution.save();

      // Create transaction record
      const transaction = new Transaction({
        user: userId,
        group: groupId,
        amount: amount,
        type: 'contribution',
        reference: reference,
        description: `Contribution to ${group.name} - Cycle ${cycle}, Week ${week}`,
        status: 'pending'
      });

      await transaction.save();

      // Generate bank details for payment
      const bankDetails = this.generateBankDetails(reference, amount);

      return {
        success: true,
        message: `💳 *Payment Details:*\n\nBank: ${bankDetails.bankName}\nAccount: ${bankDetails.accountNumber}\nName: ${bankDetails.accountName}\nAmount: ₦${amount.toLocaleString()}\nReference: ${reference}\n\n⏰ Payment expires in 30 minutes.\n\nAfter payment, you'll receive confirmation automatically.`,
        reference: reference,
        bankDetails: bankDetails
      };

    } catch (error) {
      console.error('Thrift service error:', error);
      return { success: false, error: 'Internal server error' };
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

  generateBankDetails(reference, amount) {
    // In a real implementation, you'd integrate with your payment provider
    return {
      bankName: "First Bank of Nigeria",
      accountNumber: "1234567890", // Dynamic account number based on reference
      accountName: "THRIFT BOT COLLECTIONS",
      reference: reference,
      amount: amount
    };
  }

  async confirmContribution(reference) {
    try {
      const contribution = await Contribution.findOne({ 
        transactionReference: reference 
      }).populate('user group');

      if (!contribution) {
        return { success: false, error: 'Contribution not found' };
      }

      if (contribution.status === 'confirmed') {
        return { success: false, error: 'Contribution already confirmed' };
      }

      // Update contribution status
      contribution.status = 'confirmed';
      contribution.paidAt = new Date();
      await contribution.save();

      // Update transaction status
      await Transaction.updateOne(
        { reference: reference },
        { status: 'completed' }
      );

      // Update group total contributions
      await Group.updateOne(
        { _id: contribution.group._id },
        { $inc: { totalContributions: contribution.amount } }
      );

      // Check if all members have contributed for this cycle/week
      await this.checkAndProcessRotation(contribution.group._id, contribution.cycle, contribution.week);

      return {
        success: true,
        message: `✅ Contribution confirmed!\n\nAmount: ₦${contribution.amount.toLocaleString()}\nGroup: ${contribution.group.name}\nCycle: ${contribution.cycle}, Week: ${contribution.week}`
      };

    } catch (error) {
      console.error('Confirm contribution error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async checkAndProcessRotation(groupId, cycle, week) {
    try {
      const group = await Group.findById(groupId).populate('members.user');
      
      // Count confirmed contributions for this cycle/week
      const contributionsCount = await Contribution.countDocuments({
        group: groupId,
        cycle: cycle,
        week: week,
        status: 'confirmed'
      });

      // If all active members have contributed, process payout
      const activeMembers = group.members.filter(member => member.isActive);
      
      if (contributionsCount === activeMembers.length) {
        await this.processPayout(group, cycle, week);
      }

    } catch (error) {
      console.error('Rotation check error:', error);
    }
  }

  async processPayout(group, cycle, week) {
    try {
      const Rotation = require('../models/Rotation');
      
      // Determine recipient for this week (round-robin)
      const activeMembers = group.members.filter(member => member.isActive);
      const recipientIndex = (week - 1) % activeMembers.length;
      const recipient = activeMembers[recipientIndex];

      // Calculate total payout amount
      const totalAmount = group.contributionAmount * activeMembers.length;

      // Create rotation record
      const rotation = new Rotation({
        group: group._id,
        cycle: cycle,
        week: week,
        recipient: recipient.user._id,
        amount: totalAmount,
        status: 'pending'
      });

      await rotation.save();

      // Initiate payout to recipient
      const payoutResult = await paymentService.initiatePayout(
        recipient.user,
        totalAmount,
        `Thrift payout - ${group.name} Cycle ${cycle} Week ${week}`
      );

      if (payoutResult.success) {
        rotation.status = 'paid';
        rotation.payoutDate = new Date();
        rotation.transactionReference = payoutResult.reference;
        await rotation.save();

        // Notify recipient via WhatsApp
        const whatsappService = require('./whatsappService');
        await whatsappService.sendMessage(
          recipient.user.whatsappId,
          `🎉 *Congratulations!*\n\nYou've received your thrift payout!\n\n💰 Amount: ₦${totalAmount.toLocaleString()}\n👥 Group: ${group.name}\n🔄 Cycle ${cycle}, Week ${week}\n\nThe money has been sent to your registered account.`
        );

        // Notify other group members
        for (const member of activeMembers) {
          if (member.user._id.toString() !== recipient.user._id.toString()) {
            await whatsappService.sendMessage(
              member.user.whatsappId,
              `💸 *Payout Processed*\n\n${recipient.user.name} received this week's payout of ₦${totalAmount.toLocaleString()} from ${group.name}.\n\nNext contribution cycle starts soon!`
            );
          }
        }
      }

    } catch (error) {
      console.error('Payout processing error:', error);
    }
  }
}

module.exports = new ThriftService();