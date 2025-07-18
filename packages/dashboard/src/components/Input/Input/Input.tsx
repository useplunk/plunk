import {FieldError, UseFormRegisterReturn} from 'react-hook-form';
import {AnimatePresence, motion} from 'framer-motion';
import React from 'react';

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  register: UseFormRegisterReturn;
  error?: FieldError;
  className?: string;
  min?: number;
  max?: number;
}

/**
 *
 * @param props
 * @param props.label
 * @param props.type
 * @param props.register
 * @param props.error
 * @param props.placeholder
 * @param props.className
 */
export default function Input(props: InputProps) {
  return (
    <div className={props.className}>
      <label className="block text-sm font-medium text-neutral-700">{props.label}</label>
      <div className="mt-1">
        <input
          autoComplete={'off'}
          type={props.type}
          min={props.type === 'number' ? props.min : undefined}
          max={props.type === 'number' ? props.max : undefined}
          className={
            'block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm'
          }
          placeholder={props.placeholder}
          {...props.register}
        />
      </div>
      <AnimatePresence>
        {props.error && (
          <motion.p
            initial={{height: 0}}
            animate={{height: 'auto'}}
            exit={{height: 0}}
            className="mt-1 text-xs text-red-500"
          >
            {props.error.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
