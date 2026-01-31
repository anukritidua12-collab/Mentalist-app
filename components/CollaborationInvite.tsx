import React from 'react';
import { CollaborationRequest, SharedUser } from '../types';
import { Button } from './Button';
import { Icons } from '../constants';

interface CollaborationInviteProps {
  request: CollaborationRequest;
  onAccept: (request: CollaborationRequest) => void;
  onDecline: (request: CollaborationRequest) => void;
}

export const CollaborationInvite: React.FC<CollaborationInviteProps> = ({
  request,
  onAccept,
  onDecline
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🤝</span>
          </div>
          <h2 className="text-xl font-bold">Collaboration Invite</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* From User */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <img 
              src={request.fromUser.avatar} 
              alt={request.fromUser.name}
              className="w-12 h-12 rounded-full border-2 border-white shadow-md"
            />
            <div>
              <p className="font-semibold text-slate-800">{request.fromUser.name}</p>
              <p className="text-sm text-slate-500">{request.fromUser.email}</p>
            </div>
          </div>

          {/* Message */}
          <div className="text-center py-2">
            <p className="text-slate-600">
              <span className="font-semibold text-slate-800">{request.fromUser.name}</span>
              {' '}has invited you to {request.type === 'collaborate' ? 'collaborate on' : 'view'} a task:
            </p>
          </div>

          {/* Task Preview */}
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                <Icons.Check />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{request.taskTitle}</p>
                <p className="text-xs text-indigo-600 mt-1">
                  {request.type === 'collaborate' 
                    ? '✨ You can view and edit this task' 
                    : '👀 View-only access'}
                </p>
              </div>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-xs text-slate-400 text-center">
            {request.type === 'collaborate' 
              ? 'Accepting will add this task to your "Shared with Me" list where you can collaborate together.'
              : 'Accepting will add this task to your "Shared with Me" list for reference.'}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1 py-3"
            onClick={() => onDecline(request)}
          >
            Decline
          </Button>
          <Button
            variant="primary"
            className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            onClick={() => onAccept(request)}
          >
            Accept Invite
          </Button>
        </div>
      </div>
    </div>
  );
};
