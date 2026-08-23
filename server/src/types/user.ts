export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateUserDto = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
};

export type UpdateUserDto = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
};