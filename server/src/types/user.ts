export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateUserDto = {
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  phone?: string;
  address?: string;
};

export type UpdateUserDto = {
  name?: string;
  email?: string;
  password?: string;
  profileImage?: string;
  phone?: string;
  address?: string;
};
